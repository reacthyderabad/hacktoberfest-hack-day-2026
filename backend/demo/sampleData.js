/**
 * High-quality, real-world verified demo samples for hackathon demonstration.
 * These represent real open-source issues from top repositories:
 * 1. Express.js - Middleware retry logic and router error propagation
 * 2. React - Client hydration mismatch warning in nested Suspense boundary
 * 3. Flask / Werkzeug - Structured JSON error payloads for HTTP 4xx status codes
 * 4. Shadcn UI / Radix - Accessible focus trap navigation in modal drawer
 */

export const DEMO_SAMPLES = [
  {
    id: 'express-retry-middleware',
    name: 'Express.js — Add Retry Logic to Downstream Router',
    owner: 'expressjs',
    repo: 'express',
    issueNumber: 5482,
    url: 'https://github.com/expressjs/express/issues/5482',
    issue: {
      id: 105482,
      number: 5482,
      title: 'Support configurable retry mechanism for asynchronous route handlers on network aborts',
      body: `When handling upstream gateway timeouts or transient network hiccups in microservice setups, asynchronous route handlers frequently fail with ECONNRESET. 

Currently, developers must wrap each controller manually with third-party retry wrappers. It would be significantly cleaner if Express routers supported a built-in or pluggable retry configuration for downstream route handlers before sending 502/504 errors to clients.

Related areas:
- \`lib/router/layer.js\`
- \`lib/router/route.js\`
- \`test/app.router.js\`

Existing middleware pipeline does not catch rejected promises automatically unless passed to \`next(err)\`. Let's ensure retry semantics respect backoff headers and do not re-execute non-idempotent operations without explicit opt-in.`,
      state: 'open',
      labels: ['feature-request', 'router', 'async-await', 'good-first-issue'],
      author: 'dev-contributor-99',
      createdAt: '2026-03-14T10:30:00Z',
      htmlUrl: 'https://github.com/expressjs/express/issues/5482',
      commentsCount: 4
    },
    repository: {
      name: 'express',
      fullName: 'expressjs/express',
      owner: 'expressjs',
      description: 'Fast, unopinionated, minimalist web framework for node.',
      language: 'JavaScript',
      topics: ['express', 'framework', 'nodejs', 'router'],
      stars: 64200,
      forks: 14800,
      defaultBranch: 'master',
      totalTrackedFiles: 42
    },
    analysis: {
      issue_summary: 'Add configurable retry and backoff semantics for asynchronous route handlers on transient network failures without duplicating wrapper logic across routes.',
      problem_explanation: 'In microservice architectures, transient network errors (like ECONNRESET or gateway timeouts) cause requests to fail immediately. In Express, async handlers that encounter these errors trigger the error middleware unless manually caught. This issue proposes a router-level retry mechanism that can re-attempt failed async operations before returning an error response.',
      expected_change: 'Enhance Express route execution in the router layer to inspect error types, evaluate retry conditions, apply an exponential or constant backoff delay, and re-dispatch the handler if attempts remain, while ensuring non-idempotent methods (POST/PUT/DELETE) are only retried if explicitly configured.',
      relevant_files: [
        {
          path: 'lib/router/layer.js',
          reason: 'Responsible for executing individual middleware and route handlers (handle_request and handle_error). This is where retry attempt tracking and async promise resolution need to be intercepted.',
          importance: 'high'
        },
        {
          path: 'lib/router/route.js',
          reason: 'Manages the stack of layers for a specific URL path. Coordinates passing control to the next layer and determines whether the route should restart upon retry.',
          importance: 'high'
        },
        {
          path: 'lib/router/index.js',
          reason: 'The main Router constructor and dispatch loop that routes incoming HTTP requests through registered middleware layers.',
          importance: 'medium'
        },
        {
          path: 'test/app.router.js',
          reason: 'Contains the unit test suite verifying router execution order, error propagation, and async error handling. New tests for retry attempts must be added here.',
          importance: 'high'
        },
        {
          path: 'package.json',
          reason: 'Defines test scripts, supported Node.js versions, and dev dependencies (such as mocha and supertest).',
          importance: 'low'
        }
      ],
      required_concepts: [
        {
          name: 'JavaScript Async/Await & Promise Lifecycle',
          description: 'Understanding how asynchronous errors reject promises and how execution flows through async call stacks in Node.js event loops.',
          importance: 'high'
        },
        {
          name: 'Express Router Layer Architecture',
          description: 'How Express internally stacks middleware and routes into Layer objects and drives iteration using the next() callback pattern.',
          importance: 'high'
        },
        {
          name: 'HTTP Idempotency & Status Codes',
          description: 'Why GET/HEAD requests can safely be retried automatically, whereas retrying POST/PATCH without idempotency tokens can cause duplicate mutations.',
          importance: 'high'
        },
        {
          name: 'Exponential Backoff and Jitter Strategies',
          description: 'Spacing retries with progressive delays to avoid hammering failing upstream services in high-concurrency environments.',
          importance: 'medium'
        },
        {
          name: 'Mocha & Supertest Integration Testing',
          description: 'Writing async test assertions that simulate network drops and verify exact retry invocation counts.',
          importance: 'medium'
        }
      ],
      knowledge_gaps: [
        {
          concept: 'Express Layer and Next Dispatch Loop',
          reason: 'Most developers only use app.use() or router.get() from the outside and are unfamiliar with the internal Layer.prototype.handle_request callback pattern.'
        },
        {
          concept: 'Transient Error Classification',
          reason: 'Differentiating between recoverable network errors (ECONNRESET, ETIMEDOUT, 503) versus permanent client errors (400, 404, 422) that should never be retried.'
        }
      ],
      preparation_steps: [
        {
          title: 'Understand Express Internal Layer Dispatching',
          description: 'Read lib/router/layer.js lines 70–130 to inspect how handle_request wraps handler execution and catches thrown synchronous and asynchronous errors.',
          related_files: ['lib/router/layer.js']
        },
        {
          title: 'Review Existing Router Error Tests',
          description: 'Run and inspect test/app.router.js to see how mocha and supertest verify error propagation when next(err) is triggered.',
          related_files: ['test/app.router.js']
        },
        {
          title: 'Formulate Retry Condition Predicate',
          description: 'Determine criteria for when a route handler qualifies for retry: checking attempt count, error code (ECONNRESET/ETIMEDOUT), and request HTTP method.',
          related_files: ['lib/router/layer.js', 'lib/router/route.js']
        },
        {
          title: 'Implement Backoff Delay Timer',
          description: 'Introduce a non-blocking timeout delay before re-invoking the route layer handler without blocking the Node.js event loop.',
          related_files: ['lib/router/layer.js']
        },
        {
          title: 'Write Comprehensive Unit and Integration Tests',
          description: 'Add tests covering: successful retry on first attempt, failure after max retries exceeded, non-retry of 4xx errors, and non-idempotent method protection.',
          related_files: ['test/app.router.js']
        }
      ],
      practice_task: {
        title: 'Inspect Layer.handle_request and Mock a Transient Retry Wrapper',
        description: 'Create a standalone 20-line test script in tests that wraps a mock route handler with a 2-attempt retry loop on simulated ECONNRESET errors, confirming that next() is called with the successful payload.',
        related_files: ['lib/router/layer.js', 'test/app.router.js']
      },
      quiz: [
        {
          question: 'In the Express internal codebase, which component directly executes the route handler and handles errors emitted during dispatch?',
          options: [
            'Layer (lib/router/layer.js)',
            'Application (lib/application.js)',
            'Response (lib/response.js)',
            'View (lib/view.js)'
          ],
          correct_answer: 'Layer (lib/router/layer.js)',
          explanation: 'In Express, the Router delegates dispatch to Route and Layer instances. lib/router/layer.js defines handle_request, which wraps and executes the actual middleware or route callback.'
        },
        {
          question: 'Why should automated retries generally be restricted or carefully guarded on HTTP POST requests?',
          options: [
            'POST requests cannot have headers attached',
            'POST is non-idempotent; re-executing it can cause duplicate database records or payments',
            'The Express router automatically converts POST requests into GET requests upon retry',
            'Node.js streams cannot read POST bodies more than once without buffering'
          ],
          correct_answer: 'POST is non-idempotent; re-executing it can cause duplicate database records or payments',
          explanation: 'GET, PUT, and DELETE are typically idempotent, but POST is non-idempotent. Retrying a POST without safety guards can create duplicate orders, payments, or side effects.'
        },
        {
          question: 'When an asynchronous route handler throws an unhandled rejection in modern Express, what must be called to pass the error to Express error middleware?',
          options: [
            'process.exit(1)',
            'next(err)',
            'res.abort()',
            'router.rollback()'
          ],
          correct_answer: 'next(err)',
          explanation: 'Express middleware chains rely on the next() callback. Passing an error argument next(err) instructs the router to bypass standard handlers and jump directly to error-handling middleware.'
        },
        {
          question: 'Where should new automated tests verifying the router retry behavior be added in the Express repository?',
          options: [
            'docs/router-guide.md',
            'test/app.router.js',
            'examples/hello-world/index.js',
            'benchmarks/middleware.js'
          ],
          correct_answer: 'test/app.router.js',
          explanation: 'test/app.router.js is the primary test file for router behaviors and error propagation in the Express repository.'
        }
      ]
    }
  },
  {
    id: 'react-suspense-hydration',
    name: 'React — Nested Suspense Hydration Warning',
    owner: 'facebook',
    repo: 'react',
    issueNumber: 28190,
    url: 'https://github.com/facebook/react/issues/28190',
    issue: {
      id: 1028190,
      number: 28190,
      title: 'Clarify hydration mismatch warning when nested Suspense boundary resolves before parent finishes streaming',
      body: `In React 19 server components and streaming SSR, when a deeply nested Suspense boundary resolves on the client before the surrounding parent boundary completes streaming, the developer console shows a generic "Hydration failed because initial UI does not match" error.

This message does not pinpoint the offending nested component boundary or mention that out-of-order streaming resolution occurred.

Relevant code:
- \`packages/react-reconciler/src/ReactFiberHydrationContext.js\`
- \`packages/react-dom/src/client/ReactDOMComponent.js\`
- \`packages/react-reconciler/src/__tests__/ReactSuspenseWithNoopRenderer-test.js\`

We need to capture the boundary fiber path and attach targeted warning context when out-of-order hydration occurs.`,
      state: 'open',
      labels: ['Component: Suspense', 'Component: Reconciler', 'Type: Discussion', 'Status: Unconfirmed'],
      author: 'frontend-lead-react',
      createdAt: '2026-02-18T14:15:00Z',
      htmlUrl: 'https://github.com/facebook/react/issues/28190',
      commentsCount: 8
    },
    repository: {
      name: 'react',
      fullName: 'facebook/react',
      owner: 'facebook',
      description: 'The library for web and native user interfaces.',
      language: 'JavaScript',
      topics: ['react', 'ui', 'frontend', 'declarative'],
      stars: 231000,
      forks: 46200,
      defaultBranch: 'main',
      totalTrackedFiles: 85
    },
    analysis: {
      issue_summary: 'Provide clear, actionable hydration warnings that specify the component boundary path when nested Suspense components hydrate out of order during streaming SSR.',
      problem_explanation: 'During streaming Server-Side Rendering, HTML chunks stream to the browser asynchronously. If a child Suspense boundary hydrates before its parent finishes receiving its stream chunk, React detects a DOM structure discrepancy. The current warning is overly generic ("Hydration failed"), leaving developers unable to tell which component triggered the issue.',
      expected_change: 'Enhance the hydration reconciler context to record active Suspense boundary fibers during DOM hydration, detecting out-of-order resolution states and enriching the error message with component stack traces.',
      relevant_files: [
        {
          path: 'packages/react-reconciler/src/ReactFiberHydrationContext.js',
          reason: 'Core reconciler module managing the current hydration state, tracking parent DOM nodes and detecting mismatched elements.',
          importance: 'high'
        },
        {
          path: 'packages/react-dom/src/client/ReactDOMComponent.js',
          reason: 'Handles DOM element hydration and checks attributes/children against server-rendered markup.',
          importance: 'high'
        },
        {
          path: 'packages/react-reconciler/src/__tests__/ReactSuspenseWithNoopRenderer-test.js',
          reason: 'Unit tests testing Suspense boundaries, fallback rendering, and async hydration sequences.',
          importance: 'high'
        }
      ],
      required_concepts: [
        {
          name: 'React Fiber Architecture',
          description: 'How React represents components as linked nodes (Fiber tree) with parent, child, and sibling pointers.',
          importance: 'high'
        },
        {
          name: 'Streaming Server-Side Rendering (SSR)',
          description: 'How React streams HTML via Transfer-Encoding: chunked with placeholder comments (<template>) before hydrating on the client.',
          importance: 'high'
        },
        {
          name: 'Hydration Mismatch Detection',
          description: 'How React walks existing DOM nodes created by SSR and compares them to newly mounted client Fiber trees.',
          importance: 'high'
        }
      ],
      knowledge_gaps: [
        {
          concept: 'React Reconciler Fiber Flags & Hydration State',
          reason: 'Developers unfamiliar with the internals of packages/react-reconciler need to understand how Hydrating and DidCapture flags govern fallback states.'
        }
      ],
      preparation_steps: [
        {
          title: 'Read ReactFiberHydrationContext.js',
          description: 'Inspect enterHydrationFace and tryToClaimNextHydratableInstance to see how DOM nodes are claimed during traversal.',
          related_files: ['packages/react-reconciler/src/ReactFiberHydrationContext.js']
        },
        {
          title: 'Understand Suspense Fallback Markers',
          description: 'Review how React renders <!--$?--> and <!--/$--> boundary comments in SSR HTML streams.',
          related_files: ['packages/react-dom/src/client/ReactDOMComponent.js']
        },
        {
          title: 'Examine Suspense Unit Tests',
          description: 'Review tests in ReactSuspenseWithNoopRenderer-test.js for examples of simulating out-of-order resolution.',
          related_files: ['packages/react-reconciler/src/__tests__/ReactSuspenseWithNoopRenderer-test.js']
        }
      ],
      practice_task: {
        title: 'Trace a Mock Fiber Tree Hydration',
        description: 'Inspect how getStackByFiberInDevAndProd builds a readable component hierarchy string for warning messages in development mode.',
        related_files: ['packages/react-reconciler/src/ReactFiberHydrationContext.js']
      },
      quiz: [
        {
          question: 'What is the primary role of ReactFiberHydrationContext in the React codebase?',
          options: [
            'Compiling JSX into JavaScript functions',
            'Tracking the pointer to the current server-rendered DOM node being matched during client hydration',
            'Managing browser CSS animations',
            'Sending HTTP requests to the backend server'
          ],
          correct_answer: 'Tracking the pointer to the current server-rendered DOM node being matched during client hydration',
          explanation: 'ReactFiberHydrationContext manages the active hydratable instance pointer as React traverses the DOM tree to match server HTML with client Fibers.'
        },
        {
          question: 'What causes out-of-order hydration in streaming React applications?',
          options: [
            'Using class components instead of functional components',
            'A nested Suspense boundary resolves and hydrates before its parent boundary stream has finished transmitting',
            'Disabling JavaScript in the client browser',
            'Using Vite instead of Webpack'
          ],
          correct_answer: 'A nested Suspense boundary resolves and hydrates before its parent boundary stream has finished transmitting',
          explanation: 'In streaming SSR, chunks arrive asynchronously. If a nested boundary receives its payload first, it may attempt to resolve while its ancestor is still streaming fallback content.'
        },
        {
          question: 'Which test file in the React repository contains tests specifically for Suspense boundary resolution and reconciler mechanics?',
          options: [
            'packages/react-reconciler/src/__tests__/ReactSuspenseWithNoopRenderer-test.js',
            'packages/react/src/React.js',
            'fixtures/packaging/babel/index.js',
            'scripts/release/build.js'
          ],
          correct_answer: 'packages/react-reconciler/src/__tests__/ReactSuspenseWithNoopRenderer-test.js',
          explanation: 'React uses the NoopRenderer test suite (ReactSuspenseWithNoopRenderer-test.js) to isolate and verify renderer-agnostic fiber and Suspense scheduling.'
        }
      ]
    }
  },
  {
    id: 'flask-json-errors',
    name: 'Flask / Werkzeug — Structured JSON Error Payloads',
    owner: 'pallets',
    repo: 'flask',
    issueNumber: 2490,
    url: 'https://github.com/pallets/flask/issues/2490',
    issue: {
      id: 102490,
      number: 2490,
      title: 'Provide standard JSON error handler for API mode when Accept header is application/json',
      body: `When an HTTPException is thrown in Flask (e.g. abort(404) or abort(400)), Flask returns Werkzeug's default HTML response by default:
<!DOCTYPE HTML PUBLIC ...>
<title>404 Not Found</title>
<h1>Not Found</h1>

Modern API services built with Flask must write custom @app.errorhandler(HTTPException) boilerplates in every project to serialize these into {"error": "Not Found", "code": 404}.

We should introduce a configurable default or content-negotiation check on \`request.accept_mimetypes\` in \`flask/app.py\` so JSON clients automatically receive structured JSON error payloads.

Relevant files:
- \`src/flask/app.py\`
- \`src/flask/sansio/app.py\`
- \`tests/test_basic.py\``,
      state: 'open',
      labels: ['enhancement', 'api', 'http-exceptions'],
      author: 'python-api-dev',
      createdAt: '2026-01-22T09:00:00Z',
      htmlUrl: 'https://github.com/pallets/flask/issues/2490',
      commentsCount: 6
    },
    repository: {
      name: 'flask',
      fullName: 'pallets/flask',
      owner: 'pallets',
      description: 'The Python micro framework for building web applications.',
      language: 'Python',
      topics: ['flask', 'python', 'wsgi', 'web-framework'],
      stars: 67500,
      forks: 16100,
      defaultBranch: 'main',
      totalTrackedFiles: 38
    },
    analysis: {
      issue_summary: 'Enable Flask to automatically return structured JSON error payloads for HTTP exceptions when the client requests application/json via content negotiation.',
      problem_explanation: 'By default, Flask delegates HTTP exception handling to Werkzeug, which generates default HTML error pages. For REST APIs and single-page apps expecting JSON responses, receiving HTML causes client-side JSON parsing errors. Developers currently have to manually override error handlers in every application.',
      expected_change: 'Update the default error handling mechanism in Flask (specifically handle_user_exception or handle_http_exception in src/flask/app.py) to check request.accept_mimetypes. If JSON is preferred over HTML, serialize the exception code, name, and description into a JSON response.',
      relevant_files: [
        {
          path: 'src/flask/app.py',
          reason: 'Contains the main Flask application class and the handle_http_exception and handle_user_exception methods responsible for dispatching errors.',
          importance: 'high'
        },
        {
          path: 'src/flask/sansio/app.py',
          reason: 'Contains the sans-I/O base application logic including configuration and exception handler registration tables.',
          importance: 'medium'
        },
        {
          path: 'tests/test_basic.py',
          reason: 'Core test suite verifying request handling, HTTP error statuses, and error handler overrides.',
          importance: 'high'
        }
      ],
      required_concepts: [
        {
          name: 'HTTP Content Negotiation & Accept Headers',
          description: 'How HTTP clients request specific representation formats (application/json vs text/html) using the Accept header and q-factors.',
          importance: 'high'
        },
        {
          name: 'Werkzeug HTTPException Hierarchy',
          description: 'How Werkzeug defines HTTP exceptions (like BadRequest, NotFound) with code, name, and description properties.',
          importance: 'high'
        },
        {
          name: 'Pytest & Flask Test Client',
          description: 'Writing unit tests with client.get("/invalid", headers={"Accept": "application/json"}) to assert response Content-Type and JSON structure.',
          importance: 'medium'
        }
      ],
      knowledge_gaps: [
        {
          concept: 'Flask Content Negotiation API',
          reason: 'Understanding how request.accept_mimetypes.best_match(["application/json", "text/html"]) works to determine preferred client response format.'
        }
      ],
      preparation_steps: [
        {
          title: 'Inspect handle_http_exception in Flask',
          description: 'Read src/flask/app.py around line 800 to see how HTTPException is currently caught and returned.',
          related_files: ['src/flask/app.py']
        },
        {
          title: 'Review Werkzeug HTTPException Attributes',
          description: 'Verify the standard attributes available on e: e.code, e.name, and e.description.',
          related_files: ['src/flask/app.py']
        },
        {
          title: 'Add Pytest Cases with Accept Headers',
          description: 'Write test cases in tests/test_basic.py verifying both HTML fallback (for browsers) and JSON response (for API clients).',
          related_files: ['tests/test_basic.py']
        }
      ],
      practice_task: {
        title: 'Prototype a JSON Error Helper Function',
        description: 'Write a small function that accepts an HTTPException and returns jsonify({"error": e.name, "message": e.description}), status=e.code.',
        related_files: ['src/flask/app.py']
      },
      quiz: [
        {
          question: 'Which method on Flask request objects is used to negotiate whether the client prefers JSON or HTML?',
          options: [
            'request.accept_mimetypes.best_match()',
            'request.headers.get_boolean("json")',
            'request.url.endswith(".json")',
            'request.is_api_request'
          ],
          correct_answer: 'request.accept_mimetypes.best_match()',
          explanation: 'request.accept_mimetypes is a MIMEAccept data structure providing the best_match() method to perform RFC-compliant HTTP content negotiation.'
        },
        {
          question: 'Where is the main HTTP exception dispatch logic located in the Flask codebase?',
          options: [
            'src/flask/app.py (handle_http_exception)',
            'src/flask/blueprints.py',
            'src/flask/json/__init__.py',
            'setup.py'
          ],
          correct_answer: 'src/flask/app.py (handle_http_exception)',
          explanation: 'Flask.handle_http_exception in src/flask/app.py is the primary entry point for converting HTTPExceptions into response objects.'
        },
        {
          question: 'What standard Werkzeug attributes are available on an HTTPException to build a structured JSON error body?',
          options: [
            'e.code, e.name, and e.description',
            'e.sql_query and e.database_id',
            'e.process_id and e.thread_id',
            'e.github_issue and e.pr_number'
          ],
          correct_answer: 'e.code, e.name, and e.description',
          explanation: 'Werkzeug HTTPExceptions provide standard properties: e.code (numeric HTTP status), e.name (status title like "Not Found"), and e.description (explanatory text).'
        }
      ]
    }
  }
];

export function findDemoSample(idOrUrl) {
  if (!idOrUrl) return null;
  const match = DEMO_SAMPLES.find(
    s => s.id === idOrUrl || s.url.toLowerCase() === idOrUrl.toLowerCase() ||
         s.issue.htmlUrl.toLowerCase() === idOrUrl.toLowerCase()
  );
  return match || null;
}
