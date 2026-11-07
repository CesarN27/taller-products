import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../lib/dynamodb';
import { ok, notFound, internalError } from '../lib/response';
import { withCors } from '../common/cors';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const productId = event.pathParameters?.id;
    if (!productId) return notFound('El producto no fue encontrado');

    const result = await dynamo.send(
      new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId } })
    );
    if (!result.Item) return notFound('Producto no encontrado');

    // Orders lee res.body.product
    return ok({ product: result.Item });
  } catch (error) {
    console.error('Error en get product', error);
    return internalError();
  }
}

export const getProduct = withCors(handler);
