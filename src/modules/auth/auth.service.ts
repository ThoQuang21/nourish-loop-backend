import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * STUB — khung xác thực JWT. Logic thật để TODO:
 *  - register: hash password (bcrypt), tạo User + Profile trong 1 transaction, ký JWT.
 *  - login: tìm user theo email, so sánh bcrypt, ký JWT.
 *  - validateUser/JwtStrategy cho guard.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    // TODO:
    // 1. const passwordHash = await bcrypt.hash(dto.password, 10);
    // 2. const user = await this.prisma.user.create({ data: { ...,
    //      profile: { create: { org: dto.org, address: dto.address } } } });
    // 3. return this.sign(user.id, user.role);
    void this.prisma;
    void dto;
    throw new Error('TODO: implement register');
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    // TODO:
    // 1. const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // 2. if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
    //      throw new UnauthorizedException();
    // 3. return this.sign(user.id, user.role);
    void dto;
    throw new Error('TODO: implement login');
  }

  private sign(userId: string, role: string): { accessToken: string } {
    return { accessToken: this.jwt.sign({ sub: userId, role }) };
  }
}
