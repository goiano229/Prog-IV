import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsuarioService {
  private usuarios: Usuario[] = [];
  private proximoId = 1;

  // CREATE
  create(createUsuarioDto: CreateUsuarioDto): Usuario {
    const usuario: Usuario = {
      id: this.proximoId++,
      ...createUsuarioDto,
    };
    this.usuarios.push(usuario);
    return usuario;
  }

  // READ — criando lista
  findAll(): Usuario[] {
    return this.usuarios;
  }

  // READ — buscando usuário único
  findOne(id: number): Usuario {
    const usuario = this.usuarios.find((u) => u.id === id);
    if (!usuario) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado`);
    }
    return usuario;
  }

  // UPDATE
  update(id: number, updateUsuarioDto: UpdateUsuarioDto): Usuario {
    const usuario = this.findOne(id);
    Object.assign(usuario, updateUsuarioDto);
    return usuario;
  }

  // DELETE — removendo um usuário
  remove(id: number): Usuario {
    const indice = this.usuarios.findIndex((u) => u.id === id);
    if (indice === -1) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado`);
    }
    const [removido] = this.usuarios.splice(indice, 1);
    return removido;
  }
}
