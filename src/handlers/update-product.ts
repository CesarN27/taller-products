import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../lib/dynamodb';
import { unauthorized, ok, badRequest, forbidden, notFound, internalError } from '../lib/response';
import { getAuth } from '../lib/auth';
import { withCors } from '../common/cors';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const productId = event.pathParameters?.id;
    if (!productId) return notFound('El producto no fue encontrado');

    const auth = getAuth(event);
    if (!auth) return unauthorized();
    const callerId = auth.userId;

    const existing = await dynamo.send(
      new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId } })
    );
    if (!existing.Item) return notFound('El producto no fue encontrado');

    if (existing.Item.sellerId !== callerId) {
      return forbidden('Solo puedes actualizar tus propios productos');
    }

    const { name, description, price, stock } = JSON.parse(event.body || '{}');

    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
      return badRequest('El precio debe ser un número mayor a cero');
    }
    if (
      stock !== undefined &&
      (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0)
    ) {
      return badRequest('El stock debe ser un número entero');
    }

    // actualización parcial: solo se actualiza lo que llegó
    const now = new Date().toISOString();
    const updates: string[] = ['updatedAt = :updatedAt'];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = { ':updatedAt': now };

    if (name) {
      updates.push('#name = :name'); // "name" es palabra reservada de DynamoDB
      names['#name'] = 'name';
      values[':name'] = name;
    }
    if (description) {
      updates.push('description = :description');
      values[':description'] = description;
    }
    if (price !== undefined && price !== null) {
      updates.push('price = :price');
      values[':price'] = price;
    }
    if (stock !== undefined && stock !== null) {
      updates.push('stock = :stock');
      values[':stock'] = stock;
    }

    await dynamo.send(
      new UpdateCommand({
        TableName: PRODUCTS_TABLE,
        Key: { productId },
        UpdateExpression: 'SET ' + updates.join(', '),
        ExpressionAttributeValues: values,
        ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
      })
    );

    return ok({ message: 'Producto actualizado exitosamente' });
  } catch (error) {
    console.error('Error en update product', error);
    return internalError();
  }
}

export const updateProduct = withCors(handler);
