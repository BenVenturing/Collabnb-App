import argon2 from "argon2";
import { encode } from "@auth/core/jwt";
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const emailStr = String(email).trim().toLowerCase();
    const passwordStr = String(password).trim();

    // Find user by email
    const userResult = await sql`
      SELECT u.id, u.name, u.email
      FROM auth_users u
      WHERE LOWER(u.email) = ${emailStr}
    `;

    if (userResult.length === 0) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = userResult[0];

    // Get the hashed password from auth_accounts
    const accountResult = await sql`
      SELECT password FROM auth_accounts
      WHERE "userId" = ${user.id}
        AND provider = 'credentials'
      LIMIT 1
    `;

    if (accountResult.length === 0 || !accountResult[0].password) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Verify password
    const passwordValid = await argon2.verify(
      accountResult[0].password,
      passwordStr,
    );

    if (!passwordValid) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Create JWT token
    const jwt = await encode({
      token: {
        sub: user.id.toString(),
        email: user.email,
        name: user.name,
      },
      secret: process.env.AUTH_SECRET,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return Response.json({
      jwt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return Response.json(
      { error: "Sign in failed. Please try again." },
      { status: 500 },
    );
  }
}
