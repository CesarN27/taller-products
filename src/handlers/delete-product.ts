import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../lib/dynamodb';
import { unauthorized, ok, forbidden, notFound, internalError } from '../lib/response';
import { getAuth } from '../lib/auth';
import { withCors } from '../common/cors';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const productId = event.pathParameters?.id;
    if (!productId) return notFound('El producto no existe');

    const auth = getAuth(event);
    if (!auth) return unauthorized();
    const callerId = auth.userId;

    const existing = await dynamo.send(
      new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId } })
    );
    if (!existing.Item) return notFound('El producto no existe');

    if (existing.Item.sellerId !== callerId) {
      return forbidden('Solo puedes borrar productos que tú hayas creado');
    }

    await dynamo.send(
      new DeleteCommand({ TableName: PRODUCTS_TABLE, Key: { productId } })
    );

    return ok({ message: 'Producto borrado exitosamente' });
  } catch (error) {
    console.error('Error en delete product', error);
    return internalError();
  }
}

export const deleteProduct = withCors(handler);
