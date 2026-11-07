import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamo } from '../lib/dynamodb';
import { unauthorized, badRequest, created, forbidden, internalError } from '../lib/response';
import { getAuth } from '../lib/auth';
import { withCors } from '../common/cors';
import { Product } from '../types/product';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // quién llama y con qué rol lo manda el authorizer del Gateway
    const auth = getAuth(event);
    if (!auth) return unauthorized();
    const callerId = auth.userId;
    const callerRole = auth.role;

    if (callerRole !== 'seller') {
      return forbidden('Solo los vendedores pueden crear productos');
    }

    const body = JSON.parse(event.body || '{}');
    const { name, description, price, stock } = body;

    if (!name || !description || price === undefined || stock === undefined) {
      return badRequest('Se requieren todos los elementos para crear un producto');
    }
    if (typeof price !== 'number' || price <= 0) {
      return badRequest('El precio debe ser un número mayor a cero');
    }
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 1) {
      return badRequest('El stock debe ser un número entero mayor a cero');
    }

    const now = new Date().toISOString();
    const product: Product = {
      productId: uuidv4(),
      sellerId: callerId,
      name,
      description,
      price,
      stock,
      createdAt: now,
      updatedAt: now,
    };

    await dynamo.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: product }));

    return created(product);
  } catch (error) {
    console.error('Error en create product', error);
    return internalError();
  }
}

export const createProduct = withCors(handler);
