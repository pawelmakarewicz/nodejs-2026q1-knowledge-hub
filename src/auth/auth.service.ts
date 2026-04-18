import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    return this.userService.create({
      login: dto.login,
      password: dto.password,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByLogin(dto.login);
    if (!user) {
      throw new ForbiddenException('Invalid login or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid login or password');
    }

    const payload = {
      userId: user.id,
      login: user.login,
      role: user.role.toLowerCase(),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_KEY,
      expiresIn: process.env.TOKEN_EXPIRE_TIME ?? '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_REFRESH_KEY,
      expiresIn: process.env.TOKEN_REFRESH_EXPIRE_TIME ?? '24h',
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
      });

      const newPayload = {
        userId: payload.userId,
        login: payload.login,
        role: payload.role,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET_KEY,
        expiresIn: process.env.TOKEN_EXPIRE_TIME ?? '1h',
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
        expiresIn: process.env.TOKEN_REFRESH_EXPIRE_TIME ?? '24h',
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new ForbiddenException('Invalid or expired refresh token');
    }
  }
}
