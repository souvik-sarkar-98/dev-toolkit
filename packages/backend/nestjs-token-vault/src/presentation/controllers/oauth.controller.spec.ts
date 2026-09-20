import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { OAuthController } from "./oauth.controller";
import { OAUTH_PROVIDER_REGISTRY } from "../../application/ports/oauth-provider.port";
import { ProviderNotConfiguredError } from "../../domain/errors/token-vault.errors";

const makeProviderMock = () => ({
  getSupportedScopes: jest.fn(),
  isConfigured: true,
});

describe("OAuthController (token-vault)", () => {
  let controller: OAuthController;
  let googleMock: ReturnType<typeof makeProviderMock>;
  let microsoftMock: ReturnType<typeof makeProviderMock>;
  let commandBusMock: { execute: jest.Mock };
  let queryBusMock: { execute: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    googleMock = makeProviderMock();
    microsoftMock = makeProviderMock();
    commandBusMock = { execute: jest.fn() };
    queryBusMock = { execute: jest.fn() };

    const serviceMap = new Map([
      ["google", googleMock],
      ["microsoft", microsoftMock],
    ]);

    const module = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [
        { provide: OAUTH_PROVIDER_REGISTRY, useValue: serviceMap },
        { provide: CommandBus, useValue: commandBusMock },
        { provide: QueryBus, useValue: queryBusMock },
      ],
    }).compile();

    controller = module.get(OAuthController);
  });

  // ── rate limiting ────────────────────────────────────────────────────────
  describe("rate limiting (StrictThrottle)", () => {
    it("applies explicit strict limits on callback and auth-url routes", () => {
      const callback = OAuthController.prototype.handleCallback;
      const authUrl = OAuthController.prototype.getAuthUrl;

      expect(Reflect.getMetadata("THROTTLER:LIMITstrict", callback)).toBe(5);
      expect(Reflect.getMetadata("THROTTLER:TTLstrict", callback)).toBe(60_000);
      expect(Reflect.getMetadata("THROTTLER:LIMITstrict", authUrl)).toBe(5);
      expect(Reflect.getMetadata("THROTTLER:TTLstrict", authUrl)).toBe(60_000);
    });
  });

  // ── getProviders ───────────────────────────────────────────────────────
  describe("getProviders()", () => {
    it("returns all configured provider names", async () => {
      const result = await controller.getProviders();
      expect(result).toContain("google");
      expect(result).toContain("microsoft");
    });
  });

  // ── getAuthUrl ─────────────────────────────────────────────────────────
  describe("getAuthUrl()", () => {
    it("returns both url and state from the command bus", async () => {
      commandBusMock.execute.mockResolvedValue({
        url: "https://accounts.google.com/o/oauth/auth?state=xyz",
        state: "xyz",
      });
      const result = await controller.getAuthUrl("google", undefined, undefined);
      expect(result).toEqual({
        url: "https://accounts.google.com/o/oauth/auth?state=xyz",
        state: "xyz",
      });
    });

    it("throws ProviderNotConfiguredError for an unconfigured provider", async () => {
      await expect(controller.getAuthUrl("github", undefined, undefined)).rejects.toThrow(
        ProviderNotConfiguredError,
      );
    });

    it("throws BadRequestException when scopes string exceeds 1000 chars", async () => {
      await expect(
        controller.getAuthUrl("google", "a".repeat(1001), undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it("accepts a provider name in uppercase and lowercases it internally", async () => {
      commandBusMock.execute.mockResolvedValue({ url: "https://accounts.google.com", state: "s" });
      const result = await controller.getAuthUrl("GOOGLE", undefined, undefined);
      expect(result.url).toBeTruthy();
    });
  });

  // ── handleCallback ─────────────────────────────────────────────────────
  describe("handleCallback()", () => {
    it("returns the command bus result on a successful callback", async () => {
      commandBusMock.execute.mockResolvedValue({ email: "user@example.com", tokenId: "tok-1" });
      const result = await controller.handleCallback("google", {
        code: "auth-code-1234567890",
        state: "state-1234567890",
      });
      expect(result).toEqual({ email: "user@example.com", tokenId: "tok-1" });
    });

    it("throws ProviderNotConfiguredError for an unconfigured provider", async () => {
      await expect(
        controller.handleCallback("github", { code: "code-abc", state: "state-xyz" }),
      ).rejects.toThrow(ProviderNotConfiguredError);
    });
  });

  // ── getScopes ──────────────────────────────────────────────────────────
  describe("getScopes()", () => {
    it("returns the scopes from the provider's getSupportedScopes()", async () => {
      googleMock.getSupportedScopes.mockResolvedValue(["openid", "email", "profile"]);
      const result = await controller.getScopes("google");
      expect(result).toEqual(["openid", "email", "profile"]);
    });
  });

  // ── listTokens ──────────────────────────────────────────────────────────
  describe("listTokens()", () => {
    it("returns the paged token list from the query bus", async () => {
      const page = { content: [], totalSize: 0, pageIndex: 0, pageSize: 10 };
      queryBusMock.execute.mockResolvedValue(page);
      const result = await controller.listTokens("google", { pageIndex: 0, pageSize: 10 } as any);
      expect(result).toEqual(page);
    });

    it("passes pageIndex and pageSize through to the query bus", async () => {
      const page = { content: [], totalSize: 0, pageIndex: 2, pageSize: 5 };
      queryBusMock.execute.mockResolvedValue(page);
      const result = await controller.listTokens("google", { pageIndex: 2, pageSize: 5 } as any);
      const [query] = queryBusMock.execute.mock.calls[0];
      expect(query).toMatchObject({ params: { pageIndex: 2, pageSize: 5 } });
      expect(result.pageIndex).toBe(2);
      expect(result.pageSize).toBe(5);
    });

    it("passes the account filter through to the query bus", async () => {
      queryBusMock.execute.mockResolvedValue({ content: [], totalSize: 0, pageIndex: 0, pageSize: 20 });

      await controller.listTokens("google", {
        pageIndex: 0,
        pageSize: 20,
        account: "asha.verma@example.org",
      } as any);

      const [query] = queryBusMock.execute.mock.calls[0];
      expect(query).toMatchObject({ params: { account: "asha.verma@example.org" } });
    });

    it("throws ProviderNotConfiguredError for an unconfigured provider", async () => {
      await expect(controller.listTokens("unknown", { pageIndex: 0, pageSize: 10 } as any)).rejects.toThrow(ProviderNotConfiguredError);
    });
  });

  // ── revokeToken (DELETE endpoint) ────────────────────────────────────
  describe("revokeToken()", () => {
    it("dispatches the revoke command and resolves void", async () => {
      commandBusMock.execute.mockResolvedValue(undefined);
      await expect(controller.revokeToken("google", "token-id-123")).resolves.toBeUndefined();
      expect(commandBusMock.execute).toHaveBeenCalled();
    });

    it("propagates errors thrown by the command bus", async () => {
      commandBusMock.execute.mockRejectedValue(new Error("Token not found with id token-id-123"));
      await expect(controller.revokeToken("google", "token-id-123")).rejects.toThrow(
        "Token not found with id token-id-123",
      );
    });

    it("throws ProviderNotConfiguredError for an unconfigured provider", async () => {
      await expect(controller.revokeToken("github", "id")).rejects.toThrow(ProviderNotConfiguredError);
    });
  });

  // ── microsoft provider ─────────────────────────────────────────────────
  describe("microsoft provider delegation", () => {
    it("routes getScopes to microsoftMock, not googleMock", async () => {
      microsoftMock.getSupportedScopes.mockResolvedValue(["openid", "User.Read"]);
      await controller.getScopes("microsoft");
      expect(microsoftMock.getSupportedScopes).toHaveBeenCalled();
      expect(googleMock.getSupportedScopes).not.toHaveBeenCalled();
    });
  });
});
