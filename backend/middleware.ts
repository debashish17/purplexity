import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";

const client = createSupabaseClient();

// Users this process has already synced to the database, so the upsert runs
// once per user instead of on every request.
const syncedUsers = new Set<string>();

export async function middleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization;
    if (!token) {
        res.status(401).json({ message: "Missing auth token" });
        return;
    }

    const { data, error } = await client.auth.getUser(token);
    const user = data.user;

    if (error || !user) {
        res.status(401).json({ message: "Invalid or expired auth token" });
        return;
    }

    if (!syncedUsers.has(user.id)) {
        const meta = user.user_metadata ?? {};
        try {
            await prisma.user.upsert({
                where: { id: user.id },
                update: {},
                create: {
                    id: user.id,
                    email: user.email ?? `${user.id}@users.noreply.purplexity`,
                    provider: user.app_metadata.provider === "google" ? "Google" : "Github",
                    // GitHub accounts without a display name have no full_name
                    name: meta.full_name ?? meta.name ?? meta.user_name ?? user.email ?? "User",
                },
            });
            syncedUsers.add(user.id);
        } catch (e) {
            // P2002: the email is already used by this person's other sign-in provider
            if ((e as { code?: string }).code === "P2002") {
                res.status(409).json({ message: "This email is already registered with a different sign-in provider. Sign in with that one instead." });
                return;
            }
            console.error(`Failed to sync user ${user.id}`, e);
            res.status(500).json({ message: "Could not create your user record" });
            return;
        }
    }

    req.userId = user.id;
    next();
}
