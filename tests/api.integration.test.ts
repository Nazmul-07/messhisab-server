import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import net from "node:net";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const checkMongoAvailable = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 27017 });
    socket.setTimeout(1000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
};

describe("MessHisab API integration suite (17 scenarios)", async () => {
  const mongoAvailable = await checkMongoAvailable();

  if (!mongoAvailable) {
    it("skips live DB integration tests when MongoDB is not running on 127.0.0.1:27017", () => {
      assert.ok(true);
    });
    return;
  }

  let server: Server;
  let baseUrl = "";
  let adminCookie = "";
  let memberCookie = "";
  let outsiderCookie = "";
  let messId = "";
  let inviteToken = "";
  let memberMembershipId = "";
  let bazarId = "";
  let mealId = "";
  let depositId = "";
  let expenseId = "";

  const suffix = Date.now();
  const adminEmail = `admin-${suffix}@messhisab.test`;
  const memberEmail = `member-${suffix}@messhisab.test`;
  const outsiderEmail = `outsider-${suffix}@messhisab.test`;

  const request = async (
    path: string,
    options: { method?: string; body?: unknown; cookie?: string } = {},
  ) => {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) headers["content-type"] = "application/json";
    if (options.cookie) headers["cookie"] = options.cookie;

    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { status: res.status, json, setCookie };
  };

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  it("1-3. registers, logs in, and verifies session for admin, member, and outsider", async () => {
    const regAdmin = await request("/api/auth/sign-up/email", {
      method: "POST",
      body: { name: "Admin User", email: adminEmail, password: "Password123!" },
    });
    assert.equal(regAdmin.status, 200);
    adminCookie = regAdmin.setCookie ?? "";

    const loginAdmin = await request("/api/auth/sign-in/email", {
      method: "POST",
      body: { email: adminEmail, password: "Password123!" },
    });
    assert.equal(loginAdmin.status, 200);
    if (loginAdmin.setCookie) adminCookie = loginAdmin.setCookie;

    const me = await request("/api/v1/auth/me", { cookie: adminCookie });
    assert.equal(me.status, 200);

    const regMember = await request("/api/auth/sign-up/email", {
      method: "POST",
      body: { name: "Member User", email: memberEmail, password: "Password123!" },
    });
    assert.equal(regMember.status, 200);
    memberCookie = regMember.setCookie ?? "";

    const regOutsider = await request("/api/auth/sign-up/email", {
      method: "POST",
      body: { name: "Outsider User", email: outsiderEmail, password: "Password123!" },
    });
    assert.equal(regOutsider.status, 200);
    outsiderCookie = regOutsider.setCookie ?? "";
  });

  it("4-6. creates mess, invites member, and accepts invitation", async () => {
    const createMess = await request("/api/v1/messes", {
      method: "POST",
      cookie: adminCookie,
      body: { name: "Green Villa Mess", address: "Dhanmondi, Dhaka" },
    });
    assert.equal(createMess.status, 201);
    const messData = createMess.json?.["data"] as { mess: { id: string } };
    messId = messData.mess.id;

    const invite = await request(`/api/v1/messes/${messId}/invites`, {
      method: "POST",
      cookie: adminCookie,
      body: { email: memberEmail },
    });
    assert.equal(invite.status, 201);
    inviteToken = (invite.json?.["data"] as { token: string }).token;

    const accept = await request(`/api/v1/messes/${messId}/invites/accept`, {
      method: "POST",
      cookie: memberCookie,
      body: { token: inviteToken },
    });
    assert.equal(accept.status, 200);
    const acceptData = accept.json?.["data"] as { membership: { id: string } };
    memberMembershipId = acceptData.membership.id;
  });

  it("7-8. enforces cross-tenant rejection and admin-only writes", async () => {
    const crossTenant = await request(`/api/v1/messes/${messId}`, {
      cookie: outsiderCookie,
    });
    assert.equal(crossTenant.status, 403);

    const memberWrite = await request(`/api/v1/messes/${messId}/bazar`, {
      method: "POST",
      cookie: memberCookie,
      body: {
        title: "Unauthorized Bazar",
        amountPaisa: 5000,
        purchaseDate: "2026-11-10",
        paymentSource: "CASHBOX",
        paymentMethod: "CASH",
      },
    });
    assert.equal(memberWrite.status, 403);
  });

  it("9-13. performs Bazar, Meal (with duplicate prevention), Deposit, and Expense CRUD", async () => {
    const bazar = await request(`/api/v1/messes/${messId}/bazar`, {
      method: "POST",
      cookie: adminCookie,
      body: {
        title: "Rice & Chicken",
        amountPaisa: 60000,
        purchaseDate: "2026-11-10",
        paymentSource: "MEMBER",
        paymentMethod: "CASH",
        paidByMembershipId: memberMembershipId,
      },
    });
    assert.equal(bazar.status, 201);
    bazarId = (bazar.json?.["data"] as { id: string }).id;

    const meal = await request(`/api/v1/messes/${messId}/meals`, {
      method: "POST",
      cookie: adminCookie,
      body: {
        membershipId: memberMembershipId,
        date: "2026-11-10",
        mealType: "LUNCH",
        mealHalfUnits: 2,
      },
    });
    assert.equal(meal.status, 201);
    mealId = (meal.json?.["data"] as { id: string }).id;

    const dupMeal = await request(`/api/v1/messes/${messId}/meals`, {
      method: "POST",
      cookie: adminCookie,
      body: {
        membershipId: memberMembershipId,
        date: "2026-11-10",
        mealType: "LUNCH",
        mealHalfUnits: 2,
      },
    });
    assert.equal(dupMeal.status, 409);

    const deposit = await request(`/api/v1/messes/${messId}/deposits`, {
      method: "POST",
      cookie: adminCookie,
      body: {
        membershipId: memberMembershipId,
        amountPaisa: 100000,
        depositDate: "2026-11-05",
        paymentMethod: "BKASH",
      },
    });
    assert.equal(deposit.status, 201);
    depositId = (deposit.json?.["data"] as { id: string }).id;

    const expense = await request(`/api/v1/messes/${messId}/expenses`, {
      method: "POST",
      cookie: adminCookie,
      body: {
        title: "WiFi Bill",
        category: "WIFI",
        amountPaisa: 100000,
        expenseDate: "2026-11-08",
        allocationMethod: "EQUAL",
        paymentSource: "CASHBOX",
        paymentMethod: "BKASH",
      },
    });
    assert.equal(expense.status, 201);
    expenseId = (expense.json?.["data"] as { id: string }).id;

    assert.ok(bazarId && mealId && depositId && expenseId);
  });

  it("14-17. previews settlement, closes month, and rejects closed month modifications", async () => {
    const preview = await request(`/api/v1/messes/${messId}/settlements/preview?monthKey=2026-11`, {
      cookie: memberCookie,
    });
    assert.equal(preview.status, 200);

    const close = await request(`/api/v1/messes/${messId}/settlements/close`, {
      method: "POST",
      cookie: adminCookie,
      body: { monthKey: "2026-11" },
    });
    assert.equal(close.status, 200);

    const rejected = await request(`/api/v1/messes/${messId}/bazar`, {
      method: "POST",
      cookie: adminCookie,
      body: {
        title: "Late Bazar",
        amountPaisa: 1000,
        purchaseDate: "2026-11-20",
        paymentSource: "CASHBOX",
        paymentMethod: "CASH",
      },
    });
    assert.equal(rejected.status, 409);
  });
});
