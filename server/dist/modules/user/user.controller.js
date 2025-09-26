import { userService } from './user.service';
export const userController = {
    create: async (req, res) => {
        const { email, password, displayName } = req.body;
        const user = await userService.createUser(email, password, displayName);
        res.status(201).json(user);
    },
    getOne: async (req, res) => {
        const { id } = req.params;
        const user = await userService.getUser(Number(id));
        res.json(user);
    },
};
