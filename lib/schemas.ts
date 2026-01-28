import { z } from 'zod';

export const LoginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
});

export const CreateGroupSchema = z.object({
    name: z.string().min(1, "Group name is required")
});

export const CreateMemberSchema = z.object({
    name: z.string().min(1, "Member name is required"),
    groupId: z.number().int().positive("Invalid group ID")
});

export const CreateProductSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    price: z.number().min(0, "Price must be non-negative"),
    type: z.enum(['SMALL', 'LARGE']),
    isAvailable: z.boolean().optional().default(true)
});

export const CreateRoundSchema = z.object({
    name: z.string().min(1, "Round name is required")
});

export const CreateOrderSchema = z.object({
    memberId: z.number().int().positive("Invalid Member ID"),
    items: z.array(z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1),
        price: z.number().min(0) // Validate price consistency? Or trust it? Better to trust provided price or re-fetch?
        // Usually we fetch price from DB, but for now we validate the input structure.
    })).min(1, "At least one item is required"),
    total: z.number().min(0),
    slipUrl: z.string().optional()
});
