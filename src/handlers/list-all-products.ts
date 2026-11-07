import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../lib/dynamodb';
import { ok, internalError } from '../lib/response';
import { withCors } from '../common/cors';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;

async function handler(
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const result = await dynamo.send(
      new ScanCommand({ TableName: PRODUCTS_TABLE })
    );
    return ok({ products: result.Items || [] });
  } catch (error) {
    console.error('Error en list all products', error);
    return internalError();
  }
}

export const listAllProducts = withCors(handler);
