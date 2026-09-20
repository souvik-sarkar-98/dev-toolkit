import { HttpService } from "@nestjs/axios";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { IAlertPort, AlertResult } from "../../domain/ports/alert.port";
import { AlertMessage } from "../../domain/value-objects/alert-message.vo";
import { AlertType } from "../../domain/enums/alert-type.enum";
import type { ObservabilityModuleOptions } from "../../observability.schema";
import {
  normalizeEnvironment,
  OBSERVABILITY_OPTIONS,
} from "../../observability.schema";

const MAX_SLACK_MESSAGE_LENGTH = 3500;

@Injectable()
export class SlackAlertAdapter implements IAlertPort, OnModuleInit {
  private readonly logger = new Logger(SlackAlertAdapter.name);
  // Fingerprint → last-sent epoch ms, used to suppress alert storms.
  private readonly lastSent = new Map<string, number>();

  constructor(
    @Inject(OBSERVABILITY_OPTIONS)
    private readonly options: ObservabilityModuleOptions,
    private readonly httpService: HttpService,
  ) {}

  onModuleInit(): void {
    if (this.options.enabled === false) {
      this.logger.warn('Observability is disabled (enabled: false). No alerts will be sent.');
      return;
    }
    // Fail-fast misconfiguration detection: a configured webhook that can never
    // fire (because the current environment is not in the allow-list) is almost
    // always a mistake — surface it loudly at startup instead of silently
    // dropping every alert at runtime.
    const webhookUrl = this.options.slack?.webhookUrl;
    if (!webhookUrl) return;
    const env = normalizeEnvironment(this.options.environment);
    const allow = (this.options.alertOnEnvironments ?? ["prod"]).map(
      normalizeEnvironment,
    );
    if (!allow.includes(env)) {
      this.logger.warn(
        `Slack webhook is configured but the current environment "${env}" is not in alertOnEnvironments [${allow.join(", ")}]. No alerts will be sent.`,
      );
    }
  }

  /** IAlertPort — formats an AlertMessage VO and dispatches it to Slack. */
  async send(message: AlertMessage): Promise<AlertResult> {
    const reference = message.traceId ?? "not-available";
    const stackTrace =
      this.options.includeStackTrace === true ? message.stackTrace : undefined;

    const text = `Reference: ${reference}\n${message.text}${stackTrace ? `\nStack: ${stackTrace}` : ""}`;
    return this.dispatch(text, message.type, message.text);
  }

  /**
   * Sends a free-form technical alert directly to Slack.
   * Available for consumers that need to send custom operational alerts without
   * going through the domain event pipeline.
   */
  async sendAlert(
    message: string,
    type: AlertType = "error",
  ): Promise<AlertResult> {
    return this.dispatch(message, type);
  }

  private async dispatch(
    message: string,
    type: AlertType,
    fingerprintHint?: string,
  ): Promise<AlertResult> {
    if (this.options.enabled === false) {
      return { success: false, skipped: true, error: "Observability disabled" };
    }

    const webhookUrl = this.options.slack?.webhookUrl;
    if (!webhookUrl) {
      return { success: false, error: "Slack webhook URL not configured" };
    }

    const env = normalizeEnvironment(this.options.environment);
    const allow = (this.options.alertOnEnvironments ?? ["prod"]).map(
      normalizeEnvironment,
    );
    if (!allow.includes(env)) {
      return {
        success: false,
        skipped: true,
        error: `Slack alerts disabled for environment: ${env}`,
      };
    }

    if (this.isThrottled(fingerprintHint ?? message)) {
      return { success: false, skipped: true, error: "throttled" };
    }

    const truncated =
      message.length > MAX_SLACK_MESSAGE_LENGTH
        ? `${message.slice(0, MAX_SLACK_MESSAGE_LENGTH)}\n…(truncated)`
        : message;

    const mention = this.options.mentionChannel ? "<!channel> " : "";
    const payload = {
      text: `${mention}*${type.toUpperCase()} TECHNICAL ALERT*\n*Environment:* \`${env}\`\n\n*Message:*\n>${truncated.replace(/\n/g, "\n>")}`,
    };

    try {
      await firstValueFrom(
        this.httpService.post(webhookUrl, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: this.options.httpTimeoutMs ?? 5000,
        }),
      );
      return { success: true };
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error || err?.message || "Unknown error";
      this.logger.error(`Failed to send Slack alert: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private isThrottled(message: string): boolean {
    const interval = this.options.dedupeIntervalMs ?? 60_000;
    if (interval <= 0) return false;

    const fingerprint = message.slice(0, 200);
    const now = Date.now();
    const last = this.lastSent.get(fingerprint);
    if (last !== undefined && now - last < interval) {
      return true;
    }
    this.lastSent.set(fingerprint, now);
    // Opportunistically prune stale fingerprints to bound memory.
    if (this.lastSent.size > 500) {
      for (const [key, ts] of this.lastSent) {
        if (now - ts >= interval) this.lastSent.delete(key);
      }
    }
    return false;
  }
}
