import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../lib/dynamodb';
import { ok, internalError } from '../lib/response';
import { withCors } from '../common/cors';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const sellerId = event.pathParameters?.sellerId;
    if (!sellerId) return ok({ products: [] });

    const result = await dynamo.send(
      new QueryCommand({
        TableName: PRODUCTS_TABLE,
        IndexName: 'seller-index',
        KeyConditionExpression: 'sellerId = :sellerId',
        ExpressionAttributeValues: { ':sellerId': sellerId },
      })
    );
    return ok({ products: result.Items || [] });
  } catch (error) {
    console.error('Error en list products by seller', error);
    return internalError();
  }
}

export const listProductsBySeller = withCors(handler);
