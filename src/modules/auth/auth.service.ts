import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Session, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** User kèm profile nhưng đã bỏ passwordHash để trả về client. */
type SafeUser = Omit<User, 'passwordHash'> & { profile?: unknown };

/** Kết quả đăng nhập: thông tin user + token phiên (không JWT). */
type AuthResult = { user: SafeUser; sessionToken: string; expiresAt: Date };

@Injectable()
export class AuthService {
  private static readonly SALT_ROUNDS = 10;
  private static readonly SESSION_TTL_DAYS = 7;

  constructor(private readonly prisma: PrismaService) {}

  /** Đăng ký: hash mật khẩu, tạo User + Profile, trả về thông tin user. */
  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, AuthService.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
        profile: {
          create: {
            org: dto.org,
            address: dto.address,
          },
        },
      },
      include: { profile: true },
    });

    return this.sanitize(user);
  }

  /** Đăng nhập: kiểm tra email + mật khẩu, tạo phiên mới, trả token. */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });

    const passwordOk =
      user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const session = await this.createSession(user.id);
    return {
      user: this.sanitize(user),
      sessionToken: session.token,
      expiresAt: session.expiresAt,
    };
  }

  /** Đăng xuất: xoá phiên theo token. Idempotent (token sai/thiếu vẫn trả success). */
  async logout(token?: string): Promise<{ success: boolean }> {
    if (token) {
      await this.prisma.session.deleteMany({ where: { token } });
    }
    return { success: true };
  }

  /** Lấy user hiện tại từ token phiên; token sai/hết hạn -> 401. */
  async me(token?: string): Promise<SafeUser> {
    const user = await this.userFromToken(token);
    if (!user) {
      throw new UnauthorizedException('Phiên không hợp lệ hoặc đã hết hạn');
    }
    return user;
  }

  /**
   * Helper dùng chung: trả về user nếu token còn hiệu lực, ngược lại null.
   * Tự dọn phiên đã hết hạn. (Dùng cho guard ở các module khác sau này.)
   */
  async userFromToken(token?: string): Promise<SafeUser | null> {
    if (!token) {
      return null;
    }
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: { include: { profile: true } } },
    });
    if (!session) {
      return null;
    }
    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.session
        .delete({ where: { id: session.id } })
        .catch(() => undefined);
      return null;
    }
    return this.sanitize(session.user);
  }

  /** Tạo phiên mới với token ngẫu nhiên 64 hex. */
  private createSession(userId: string): Promise<Session> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + AuthService.SESSION_TTL_DAYS * 86_400_000,
    );
    return this.prisma.session.create({ data: { token, userId, expiresAt } });
  }

  /** Bỏ passwordHash trước khi trả về client. */
  private sanitize(user: User & { profile?: unknown }): SafeUser {
    const { passwordHash: _omit, ...safe } = user;
    return safe;
  }
}
