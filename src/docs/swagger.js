export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DivineIT Trading DSS API',
    version: '1.0.0',
    description: 'Interactive API documentation for DivineIT Trading Decision Support System (DSS) backend.',
  },
  servers: [
    {
      url: '/',
      description: 'Current server (Auto-detect host & port)',
    },
    {
      url: 'http://localhost:5000',
      description: 'Local development server (PORT 5000)',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local development server (PORT 3000)',
    },
  ],
  tags: [
    { name: 'System', description: 'System health and status endpoints' },
    { name: 'Auth', description: 'Authentication, JWT access & refresh token rotation' },
    { name: 'Information', description: 'Market information and announcement management' },
    { name: 'Signal', description: 'Trading signals management' },
    { name: 'News', description: 'Global financial news feed (FreeNewsApi)' },
    { name: 'Market', description: 'Modular market prices (Yahoo Finance) and crypto market metrics (CoinMarketCap)' },
  ],
  paths: {
    '/': {
      get: {
        tags: ['System'],
        summary: 'Root welcome endpoint',
        responses: {
          200: {
            description: 'API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'DivineIT Trading DSS API is running' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check endpoint',
        responses: {
          200: {
            description: 'Service health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'OK' },
                    message: { type: 'string', example: 'DivineIT Trading DSS API is running' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', example: 'trader_pro' },
                  email: { type: 'string', format: 'email', example: 'trader@example.com' },
                  password: { type: 'string', format: 'password', example: 'Password123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered, returns access & refresh tokens' },
          400: { description: 'Validation error' },
          409: { description: 'Email or username already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email/username and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  identifier: { type: 'string', example: 'admin@tradebackend.local' },
                  password: { type: 'string', format: 'password', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful, returns access & refresh tokens' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and issue a new access token',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'New access & refresh token pair issued' },
          401: { description: 'Invalid, expired, or reused refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke current refresh token and clear cookie',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke all active refresh tokens for the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'All sessions revoked' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Authenticated user profile' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/auth/change-password': {
      patch: {
        tags: ['Auth'],
        summary: 'Change password and revoke all existing sessions',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed and all sessions revoked' },
          401: { description: 'Unauthorized or incorrect current password' },
        },
      },
    },
    '/information': {
      get: {
        tags: ['Information'],
        summary: 'Get all information entries',
        responses: {
          200: {
            description: 'List of all information entries',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Information' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Information'],
        summary: 'Create a new information entry',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateInfoInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Information' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error (missing title or body)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/information/new': {
      get: {
        tags: ['Information'],
        summary: 'Get recent information entries (past 7 days)',
        responses: {
          200: {
            description: 'List of recent information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Information' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/information/{id}': {
      get: {
        tags: ['Information'],
        summary: 'Get information detail by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Information ID',
            example: 1,
          },
        ],
        responses: {
          200: {
            description: 'Information found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Information' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Information not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Information'],
        summary: 'Update information entry by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Information ID',
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateInfoInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Information' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Information'],
        summary: 'Delete information entry by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Information ID',
            example: 1,
          },
        ],
        responses: {
          200: {
            description: 'Deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Information' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/signal': {
      get: {
        tags: ['Signal'],
        summary: 'Get all trading signals',
        responses: {
          200: {
            description: 'List of signals',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Signal' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Signal'],
        summary: 'Create a new trading signal',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSignalInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Signal created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Signal' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Missing required fields (symbol, type, entry_price)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/signal/my': {
      get: {
        tags: ['Signal'],
        summary: 'Get signals created by authenticated user',
        responses: {
          200: {
            description: 'List of user signals',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Signal' },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized (requires authentication)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/signal/sender/{sender_id}': {
      get: {
        tags: ['Signal'],
        summary: 'Get signals by sender/user ID',
        parameters: [
          {
            name: 'sender_id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'User ID of sender',
            example: 1,
          },
        ],
        responses: {
          200: {
            description: 'Signals from sender',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Signal' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/signal/{id}': {
      get: {
        tags: ['Signal'],
        summary: 'Get signal detail by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Signal ID',
            example: 1,
          },
        ],
        responses: {
          200: {
            description: 'Signal details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Signal' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Signal not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Signal'],
        summary: 'Update signal by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Signal ID',
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateSignalInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Signal updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Signal' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Signal'],
        summary: 'Delete signal by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Signal ID',
            example: 1,
          },
        ],
        responses: {
          200: {
            description: 'Signal deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Signal deleted successfully' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/news': {
      get: {
        tags: ['News'],
        summary: 'Get financial news feed (FreeNewsApi)',
        parameters: [
          {
            name: 'topic',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'finance' },
            description: 'News topic/category (e.g. finance, economy, digital currencies)',
          },
          {
            name: 'language',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'en' },
            description: 'Language code',
          },
          {
            name: 'country',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'us' },
            description: 'Country code',
          },
          {
            name: 'in_title',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter articles by title keyword',
          },
          {
            name: 'refresh',
            in: 'query',
            required: false,
            schema: { type: 'boolean', default: false },
            description: 'Bypass 2-minute cache',
          },
        ],
        responses: {
          200: {
            description: 'List of finance news articles',
          },
        },
      },
    },
    '/news/{uuid}': {
      get: {
        tags: ['News'],
        summary: 'Get full news article detail by UUID',
        parameters: [
          {
            name: 'uuid',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Article UUID from /news feed',
          },
        ],
        responses: {
          200: { description: 'Article details found' },
          404: { description: 'News article not found' },
        },
      },
    },
    '/market': {
      get: {
        tags: ['Market'],
        summary: 'Get market prices across all modules (or filter by module)',
        parameters: [
          {
            name: 'module',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Optional comma-separated module filter: index-commodity, us-stocks, indo-stocks, us-treasury, crypto',
            example: 'us-stocks,crypto',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10 },
            description: 'Number of CMC crypto listings when crypto module is included',
          },
          {
            name: 'convert',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'USD' },
            description: 'Currency conversion for CMC listings (e.g. USD, IDR)',
          },
        ],
        responses: {
          200: { description: 'Market data grouped by module' },
        },
      },
    },
    '/market/modules': {
      get: {
        tags: ['Market'],
        summary: 'Get list of selectable market modules and their tickers',
        responses: {
          200: { description: 'Available market modules' },
        },
      },
    },
    '/market/{module}': {
      get: {
        tags: ['Market'],
        summary: 'Get market prices for a specific module (Crypto module includes CMC listings & Fear/Greed)',
        parameters: [
          {
            name: 'module',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              enum: ['index-commodity', 'us-stocks', 'indo-stocks', 'us-treasury', 'crypto'],
            },
            description: 'Target market module key',
            example: 'crypto',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10 },
            description: 'CMC listings limit (only used when module is crypto)',
          },
          {
            name: 'convert',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'USD' },
            description: 'CMC quote currency (only used when module is crypto)',
          },
        ],
        responses: {
          200: { description: 'Module market data found' },
          400: { description: 'Invalid market module' },
        },
      },
    },
    '/market/crypto/listings': {
      get: {
        tags: ['Market'],
        summary: 'Get latest cryptocurrency market listings from CoinMarketCap',
        parameters: [
          {
            name: 'start',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10 },
          },
          {
            name: 'convert',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'USD' },
          },
        ],
        responses: {
          200: { description: 'CoinMarketCap latest listings' },
        },
      },
    },
    '/market/crypto/fear-and-greed': {
      get: {
        tags: ['Market'],
        summary: 'Get latest Crypto Fear & Greed Index from CoinMarketCap',
        responses: {
          200: { description: 'CoinMarketCap Fear & Greed Index' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Information: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Bitcoin Halving Event Update' },
          body: { type: 'string', example: 'Detailed analysis of post-halving network difficulty...' },
          sender_id: { type: 'integer', nullable: true, example: 1 },
          sender: { type: 'string', example: 'System' },
          created_at: { type: 'string', format: 'date-time', example: '2026-11-06T00:00:00.000Z' },
          updated_at: { type: 'string', format: 'date-time', nullable: true, example: null },
        },
      },
      CreateInfoInput: {
        type: 'object',
        required: ['title', 'body'],
        properties: {
          title: { type: 'string', example: 'Market Alert: Volatility Expected' },
          body: { type: 'string', example: 'CPI report scheduled for release at 13:30 UTC.' },
        },
      },
      UpdateInfoInput: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'Updated Alert Title' },
          body: { type: 'string', example: 'Updated message content.' },
        },
      },
      Signal: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          symbol: { type: 'string', example: 'BTC' },
          type: { type: 'string', enum: ['Long', 'Short'], example: 'Long' },
          entry_price: { type: 'number', example: 67500.5 },
          sl_price: { type: 'number', example: 66000.0 },
          tp_price: { type: 'number', example: 71000.0 },
          status: { type: 'string', enum: ['active', 'running', 'cancelled', 'profit', 'loss'], example: 'active' },
          sender_id: { type: 'integer', nullable: true, example: 1 },
          sender: { type: 'string', example: 'System' },
          created_at: { type: 'string', format: 'date-time', example: '2026-11-06T00:00:00.000Z' },
        },
      },
      CreateSignalInput: {
        type: 'object',
        required: ['symbol', 'type', 'entry_price'],
        properties: {
          symbol: { type: 'string', example: 'BTC' },
          type: { type: 'string', enum: ['Long', 'Short'], example: 'Long' },
          entry_price: { type: 'number', example: 67500.5 },
          sl_price: { type: 'number', example: 66000.0 },
          tp_price: { type: 'number', example: 71000.0 },
          status: { type: 'string', enum: ['active', 'running', 'cancelled', 'profit', 'loss'], example: 'active' },
        },
      },
      UpdateSignalInput: {
        type: 'object',
        properties: {
          symbol_id: { type: 'string', example: 'BTC' },
          type: { type: 'string', enum: ['Long', 'Short'], example: 'Long' },
          entry_price: { type: 'number', example: 68000.0 },
          sl_price: { type: 'number', example: 66500.0 },
          tp_price: { type: 'number', example: 72000.0 },
          status: { type: 'string', example: 'running' },
        },
      },
      MarketSummary: {
        type: 'object',
        properties: {
          ticker: { type: 'string', example: 'BTC' },
          price_usd: { type: 'number', example: 67500.5 },
          price_idr: { type: 'number', example: 1086758050 },
          pct_change_1h: { type: 'number', example: 1.25 },
          point_change_1h: { type: 'number', example: 830.5 },
        },
      },
      MarketAnalytic: {
        type: 'object',
        properties: {
          ema_50: { type: 'number', example: 66800.25 },
          distance_to_ema50_pct: { type: 'string', example: '1.05%' },
          trend_status: { type: 'string', example: 'UPTREND' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Resource not found or bad request' },
        },
      },
    },
  },
};

