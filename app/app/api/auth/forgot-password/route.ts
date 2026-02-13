import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

const Schema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
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

    const { email } = parsed.data;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // IMPORTANTE: Sempre retornar sucesso mesmo se o email não existir
    // (evita enumeration attack - não revelar quais emails existem no sistema)
    if (!user) {
      return NextResponse.json({
        ok: true,
        message:
          "If an account exists with this email, you will receive a password reset link.",
      });
    }

    // Invalidar tokens antigos deste usuário (opcional mas recomendado)
    await prisma.password_reset_token.deleteMany({
      where: {
        user_id: user.id,
        used_at: null,
      },
    });

    // Gerar token seguro
    const token = crypto.randomBytes(32).toString("hex");

    // Criar registro do token (expira em 1 hora)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.password_reset_token.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    });

    // Enviar email
    const emailResult = await sendPasswordResetEmail(user.email, token);

    if (!emailResult.success) {
      console.error("Failed to send reset email:", emailResult.error);
      // Não revelar erro de email para o usuário (segurança)
    }

    return NextResponse.json({
      ok: true,
      message:
        "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("Error in forgot-password API:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "An error occurred. Please try again later.",
      },
      { status: 500 },
    );
  }
}
