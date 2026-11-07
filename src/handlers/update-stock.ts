import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../lib/dynamodb';
import { unauthorized, ok, badRequest, notFound, internalError } from '../lib/response';
import { getAuth } from '../lib/auth';
import { withCors } from '../common/cors';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;

// Descuenta stock. La invoca Orders directo (sin API Gateway): en esa invocación no hay
// requestContext ni authorizer, así que solo se exige token si llega por la API.
async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    if (event.requestContext && !getAuth(event)) return unauthorized();

    const productId = event.pathParameters?.id;
    if (!productId) return notFound('Producto no encontrado');

    const existing = await dynamo.send(
      new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId } })
    );
    if (!existing.Item) return notFound('Producto no encontrado');

    const { quantity } = JSON.parse(event.body || '{}');
    if (
      quantity === undefined ||
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return badRequest('quantity debe ser un número entero positivo');
    }

    if (existing.Item.stock < quantity) {
      return badRequest('Stock insuficiente');
    }

    const now = new Date().toISOString();
    await dynamo.send(
      new UpdateCommand({
        TableName: PRODUCTS_TABLE,
        Key: { productId },
        UpdateExpression: 'SET stock = stock - :quantity, updatedAt = :updatedAt',
        // así el stock nunca queda negativo aunque dos órdenes lleguen a la vez
        ConditionExpression: 'stock >= :quantity',
        ExpressionAttributeValues: { ':quantity': quantity, ':updatedAt': now },
      })
    );

    return ok({ message: 'Stock actualizado exitosamente' });
  } catch (error) {
    console.error('Error en update stock', error);
    return internalError();
  }
}

export const updateStock = withCors(handler);
