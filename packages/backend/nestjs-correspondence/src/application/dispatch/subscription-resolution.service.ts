import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { IResourceSubscriptionRepository } from '../../domain/repositories/resource-subscription.repository';
import { IUserLookupPort } from '@ssdev-toolkit/nestjs-core';
import { IUserRolePort } from '@ssdev-toolkit/nestjs-auth';
import {
  CorrespondenceRecipients,
  TargetUsersRecipients,
  TargetRolesRecipients,
  TargetResourceRecipients,
} from '../model/correspondence-types';
import { ResourceSubscription } from '../../domain/aggregates/resource-subscription.aggregate';
import { EmailRecipientPolicy } from '../../domain/policies/email-recipient.policy';
import { PushRecipientPolicy } from '../../domain/policies/push-recipient.policy';
import { EmailRole } from '../../domain/enums/email-role.enum';
import { SubscriberType } from '../../domain/enums/subscriber-type.enum';

export interface ResolvedRecipients {
  targetUserIds: string[];
  emailTo: string[];
  emailCc: string[];
  pushUserIds: string[];
}

/** Local mapping shape — not exported. Maps to a consistent user record for dispatch. */
interface CorrespondenceTargetUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Recipient-resolution step of the dispatch engine. Turns a spec's abstract
 * {@link CorrespondenceRecipients} into concrete delivery targets, supporting
 * three modes — explicit users, roles, and resource subscribers. Roles are
 * expanded to users via {@link IUserRolePort} + {@link IUserLookupPort}, and the
 * email/push recipient policies decide eligibility and TO/CC roles. Returns the
 * `targetUserIds`, `emailTo`/`emailCc` lists, and `pushUserIds` the orchestrator
 * needs; both user ports are optional and their absence degrades gracefully.
 */
@Injectable()
export class SubscriptionResolutionService {
  private readonly logger = new Logger(SubscriptionResolutionService.name);

  constructor(
    @Inject(IResourceSubscriptionRepository)
    private readonly subscriptionRepo: IResourceSubscriptionRepository,
    @Optional() @Inject(IUserLookupPort) private readonly userLookup: IUserLookupPort | null,
    @Optional() @Inject(IUserRolePort) private readonly userRole: IUserRolePort | null,
  ) { }

  async resolve(
    recipients: CorrespondenceRecipients,
    overrideEmails?: string[],
    cc?: string[],
  ): Promise<ResolvedRecipients> {
    if (recipients.mode === 'users') {
      return this.resolveForUsers(recipients, overrideEmails, cc);
    }
    if (recipients.mode === 'roles') {
      return this.resolveForRoles(recipients, overrideEmails, cc);
    }
    return this.resolveForResource(recipients, overrideEmails, cc);
  }

  private async resolveForUsers(
    recipients: TargetUsersRecipients,
    overrideEmails?: string[],
    cc?: string[],
  ): Promise<ResolvedRecipients> {
    const users = await this.resolveByUserIds(recipients.userIds);
    const emailTo = overrideEmails?.length
      ? overrideEmails
      : users.map((u) => u.email).filter(Boolean);

    return {
      targetUserIds: recipients.userIds,
      emailTo,
      emailCc: cc ?? [],
      pushUserIds: recipients.userIds,
    };
  }

  private async resolveForRoles(
    recipients: TargetRolesRecipients,
    overrideEmails?: string[],
    cc?: string[],
  ): Promise<ResolvedRecipients> {
    const allUsers: CorrespondenceTargetUser[] = [];
    for (const role of recipients.roleNames) {
      const users = await this.resolveByRoleName(role);
      allUsers.push(...users);
    }
    const uniqueUsers = this.deduplicateUsers(allUsers);

    const emailTo = overrideEmails?.length
      ? overrideEmails
      : uniqueUsers.map((u) => u.email).filter(Boolean);

    return {
      targetUserIds: uniqueUsers.map((u) => u.id),
      emailTo,
      emailCc: cc ?? [],
      pushUserIds: uniqueUsers.map((u) => u.id),
    };
  }

  private async resolveForResource(
    recipients: TargetResourceRecipients,
    overrideEmails?: string[],
    cc?: string[],
  ): Promise<ResolvedRecipients> {
    const excludeSet = new Set(recipients.excludeUserIds ?? []);

    const subscriptions = await this.subscriptionRepo.findActiveSubscribersForResource(
      recipients.referenceType,
      recipients.referenceId,
    );

    const userSubscriptions = subscriptions
      .filter((s) => s.subscriberType !== SubscriberType.ROLE)
      .filter((s) => !s.userId || !excludeSet.has(s.userId));
    const roleSubscriptions = subscriptions.filter(
      (s) => s.subscriberType === SubscriberType.ROLE,
    );

    const emailSubscriptions = EmailRecipientPolicy.filterEligibleSubscribers(userSubscriptions);
    const pushSubscriptions = PushRecipientPolicy.filterEligibleSubscribers(userSubscriptions);

    const emailTo = overrideEmails?.length
      ? overrideEmails
      : emailSubscriptions
        .filter((s) => EmailRecipientPolicy.getEmailRole(s) === EmailRole.TO)
        .map((s) => s.userEmail)
        .filter((e): e is string => !!e);

    const emailCcFromSubs = emailSubscriptions
      .filter((s) => EmailRecipientPolicy.getEmailRole(s) === EmailRole.CC)
      .map((s) => s.userEmail)
      .filter((e): e is string => !!e);

    const allUserIds = [
      ...new Set(
        userSubscriptions.map((s) => s.userId).filter((id): id is string => !!id),
      ),
    ];

    const pushUserIds = pushSubscriptions
      .map((s) => s.userId)
      .filter((id): id is string => !!id);

    // Expand role subscriptions to concrete users via IUserRolePort + IUserLookupPort
    if (roleSubscriptions.length > 0) {
      const roleExpandedUsers: CorrespondenceTargetUser[] = [];
      const seenRoles = new Set<string>();
      for (const s of roleSubscriptions) {
        if (s.roleName && !seenRoles.has(s.roleName)) {
          seenRoles.add(s.roleName);
          const users = await this.resolveByRoleName(s.roleName);
          roleExpandedUsers.push(...users);
        }
      }
      const uniqueRoleUsers = this.deduplicateUsers(roleExpandedUsers);
      const roleUserIds = uniqueRoleUsers.map((u) => u.id);

      for (const id of roleUserIds) {
        if (!excludeSet.has(id)) {
          if (!allUserIds.includes(id)) allUserIds.push(id);
          if (!pushUserIds.includes(id)) pushUserIds.push(id);
        }
      }

      if (!overrideEmails?.length) {
        const emailEligibleRoleSubs = EmailRecipientPolicy.filterEligibleSubscribers(roleSubscriptions);
        const roleEmailToSubs = emailEligibleRoleSubs.filter(
          (s) => EmailRecipientPolicy.getEmailRole(s) === EmailRole.TO,
        );
        const roleEmailCcSubs = emailEligibleRoleSubs.filter(
          (s) => EmailRecipientPolicy.getEmailRole(s) === EmailRole.CC,
        );

        // KNOWN DESIGN LIMITATION (HIGH-4): When a role-level subscription has EMAIL/TO or
        // EMAIL/CC enabled, ALL users in that role receive email regardless of whether individual
        // users have opted out via their own USER-level channel preferences. Resolving per-user
        // opt-outs for role subscriptions requires loading each user's ResourceSubscription and
        // checking its channel config, which is not done here. Until that is implemented, role
        // email fan-out acts as a broadcast to every user in the role.
        if (roleEmailToSubs.length > 0) {
          for (const u of uniqueRoleUsers) {
            if (u.email && !excludeSet.has(u.id) && !emailTo.includes(u.email)) emailTo.push(u.email);
          }
        }
        if (roleEmailCcSubs.length > 0) {
          for (const u of uniqueRoleUsers) {
            if (u.email && !excludeSet.has(u.id) && !emailCcFromSubs.includes(u.email)) emailCcFromSubs.push(u.email);
          }
        }
      }
    }

    return {
      targetUserIds: allUserIds,
      emailTo,
      emailCc: [...(cc ?? []), ...emailCcFromSubs],
      pushUserIds,
    };
  }

  /**
   * Two-step resolution: idpSubs via IUserRolePort, then UserInfo via IUserLookupPort.
   * Returns [] when either port is not registered.
   */
  private async resolveByRoleName(roleName: string): Promise<CorrespondenceTargetUser[]> {
    if (!this.userRole || !this.userLookup) {
      this.logger.warn(
        `resolveByRoleName(${roleName}): IUserRolePort or IUserLookupPort not registered — skipping role expansion`,
      );
      return [];
    }
    const idpSubs = await this.userRole.findIdPSubsByRole(roleName);
    if (!idpSubs.length) return [];
    const users = await this.userLookup.findByIdPSubs(idpSubs);
    return users.map((u) => ({ id: u.id, email: u.email ?? '', name: u.fullName }));
  }

  /** Resolve a list of userIds to target users via IUserLookupPort. Returns [] when not registered. */
  private async resolveByUserIds(ids: string[]): Promise<CorrespondenceTargetUser[]> {
    if (!this.userLookup || !ids.length) return [];
    const users = await this.userLookup.findByIds(ids);
    return users.map((u) => ({ id: u.id, email: u.email ?? '', name: u.fullName }));
  }

  private deduplicateUsers(users: CorrespondenceTargetUser[]): CorrespondenceTargetUser[] {
    const seen = new Set<string>();
    return users.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }
}
