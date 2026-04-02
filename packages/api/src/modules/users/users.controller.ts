import { Request, Response } from 'express';
import { createUserSchema, updateUserSchema } from '@resa-esviere/shared';
import * as usersService from './users.service.js';

export async function list(_req: Request, res: Response) {
  const users = await usersService.listUsers();
  res.json({ success: true, data: users });
}

export async function getById(req: Request, res: Response) {
  const user = await usersService.getUserById(Number(req.params.id));
  res.json({ success: true, data: user });
}

export async function create(req: Request, res: Response) {
  const data = createUserSchema.parse(req.body);
  const user = await usersService.createUser(data, req.user!.sub);
  res.status(201).json({ success: true, data: user });
}

export async function update(req: Request, res: Response) {
  const data = updateUserSchema.parse(req.body);
  const user = await usersService.updateUser(Number(req.params.id), data, req.user!.sub);
  res.json({ success: true, data: user });
}

export async function deactivate(req: Request, res: Response) {
  const user = await usersService.deactivateUser(Number(req.params.id), req.user!.sub);
  res.json({ success: true, data: user });
}
