import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { ApiDoc, UUID_ERRORS, INVALID_INPUT } from '../common/decorators';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiDoc({
    summary: 'Get all users',
    responses: [{ status: 200, description: 'List of all users' }],
  })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiDoc({
    summary: 'Get user by id',
    responses: [{ status: 200, description: 'User found' }, ...UUID_ERRORS],
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }

  @Roles('admin')
  @Post()
  @ApiDoc({
    summary: 'Create a new user',
    responses: [{ status: 201, description: 'User created' }, ...INVALID_INPUT],
  })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Roles('admin')
  @Put(':id')
  @ApiDoc({
    summary: 'Update user password or role',
    responses: [
      { status: 200, description: 'User updated' },
      { status: 400, description: 'Invalid UUID or input data' },
      { status: 403, description: 'Old password is incorrect' },
      { status: 404, description: 'User not found' },
    ],
  })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePasswordDto & { role?: string },
  ) {
    return this.userService.updateUser(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: 'Delete a user',
    responses: [{ status: 204, description: 'User deleted' }, ...UUID_ERRORS],
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
