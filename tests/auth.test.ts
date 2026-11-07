import { createHmac } from "crypto";
import { signJwt, verifyJwt, requireAuth, normalizeCelular, isValidCelularBR } from "../lib/auth";
import { POST as requestOtp } from "../app/api/auth/otp/route";
import { POST as verifyOtp } from "../app/api/auth/verify/route";
describe("Authentication", () => {
  it("normalizes Brazilian numbers", () => {
    expect(normalizeCelular("(11) 99999-9999")).toBe("+5511999999999");
    expect(isValidCelularBR("123")).toBe(false);
  });
  it("requires a signed token; body and arbitrary headers cannot identify the user", () => {
    const token = signJwt({ userId: "+5511999999999", companyId: "spoofed" });
    expect(requireAuth(new Request("http://localhost", { headers: { authorization: "Bearer " + token } })))
      .toEqual({ userId: "+5511999999999", celular: "+5511999999999" });
    expect(() => requireAuth(new Request("http://localhost", { headers: { "x-user-id": "victim" } }))).toThrow();
    expect(verifyJwt(token.slice(0, -2) + "xx")).toBeNull();
  });
  it("rejects expiration at the exact boundary and missing expiry", () => {
    expect(verifyJwt(signJwt({ userId: "u" }, 0))).toBeNull();
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ userId: "u", iss: "w2talent", aud: "w2talent" })).toString("base64url");
    const data = header + "." + payload;
    const secret = process.env.JWT_SECRET ?? "test-only-secret-at-least-32-characters";
    expect(verifyJwt(data + "." + createHmac("sha256", secret).update(data).digest("base64url"))).toBeNull();
  });
  it("does not simulate SMS or authenticate without a provider", async () => {
    for (const route of [requestOtp, verifyOtp]) {
      const response = await route();
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.sent).toBeUndefined();
      expect(body.token).toBeUndefined();
      expect(body.code).toBe("SMS_NOT_CONFIGURED");
    }
  });
});
