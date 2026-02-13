import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const Schema = z.object({
  token: z.string().min(1, { message: "Token is required" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          errors: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;

    // Buscar token no banco
    const resetToken = await prisma.password_reset_token.findUnique({
      where: { token },
      include: { user: true },
    });

    // Validar token
    if (!resetToken) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid or expired reset link.",
        },
        { status: 400 },
      );
    }

    // Verificar se já foi usado
    if (resetToken.used_at) {
      return NextResponse.json(
        {
          ok: false,
          message: "This reset link has already been used.",
        },
        { status: 400 },
      );
    }

    // Verificar se expirou
    if (new Date() > resetToken.expires_at) {
      return NextResponse.json(
        {
          ok: false,
          message: "This reset link has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Atualizar senha e marcar token como usado (transação)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.user_id },
        data: { password_hash: passwordHash },
      }),
      prisma.password_reset_token.update({
        where: { id: resetToken.id },
        data: { used_at: new Date() },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message:
        "Password updated successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Error in reset-password API:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "An error occurred. Please try again later.",
      },
      { status: 500 },
    );
  }
}
