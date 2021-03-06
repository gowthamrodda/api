import * as express from 'express';
import {ErrorRequestHandler, Express, Handler, NextFunction, Request, Response} from 'express';
import * as http from 'http';
import {SakuraApiConfig} from '../boot/sakura-api-config';
import {modelSymbols} from './@model/model';
import {ISakuraApiClassRoute, routableSymbols} from './@routable';
import {IRoutableLocals} from './@routable/routable';
import {SakuraMongoDbConnection} from './sakura-mongo-db-connection';

const debug = {
  normal: require('debug')('sapi:SakuraApi'),
  route: require('debug')('sapi:route')
};

/**
 * A set of properties defining the configuration of the server.
 */
export interface ServerConfig {
  /**
   * An Express compatible address for the server to bind to.
   */
  address?: string;
  /**
   * An Express compatible port for the server to bind to.
   */
  port?: number;
  /**
   * A message that you'd like printed to the screen when the server is started.
   */
  bootMessage?: string;
}

/**
 * The interface of an object returned from a SakuraApi module (for example native-authentication-authority)
 */
export interface SakuraApiModuleResult {
  models: any[];
  routables: any[];
}

export interface SakuraApiModule {
  // tslint:disable-next-line:variable-name
  module: (SakuraApi, any) => any;
  options?: any;
}

/**
 * Used for [[SakuraApi]] constructor
 */
export interface SakuraApiOptions {
  app?: Express;
  /**
   * Optionally sets [[SakuraApiConfig]] manually, otherwise, the configuration will be loaded automatically.
   */
  config?: any;
  /**
   * Allows the configuration file location to be overridden. By default [[SakuraApiConfig]] looks for
   * `config/environment.json`.
   */
  configPath?: any;
  /**
   * Optionally sets [[SakuraMongoDbConnection]], otherwise, the configuration will be loaded automatically.
   */
  dbConfig?: SakuraMongoDbConnection;
  /**
   * An array of objects that are decorated with @[[Model]]. Alternatively, for testing purposes, a Model can be
   * mocked by passing in the following object literal:
   * <pre>
   *   {
   *      use: SomeMockModel,
   *      for: TheModelBeingReplacedByTheMock
   *   }
   * </pre>
   */
  models: any[];
  /**
   * An array of objects that are decorated with @[[Routable]]. Alternatively, for testing purposes, a Routable can be
   * mocked by passing in the following object literal:
   * <pre>
   *   {
   *      use: SomeMockRoutable,
   *      for: TheRoutableBeingReplacedByTheMock
   *   }
   * </pre>
   */
  routables: any[];
  /**
   * Takes an array of [[SakuraApiModule]]s, or an empty array. This is how you add a module to SakuraApi. A module
   * adds Routable and Module classes; they're usually a set of add-on functionality that either you or a third-party
   * have defined. For example, `auth-native-authority` is a SakuraApi Module.
   */
  modules?: SakuraApiModule[];
}

/**
 * @outdatedDoc
 *
 * SakuraApi is responsible for:
 * 1. Instantiating Express.js.
 * 2. Loading the server's configuration via [[SakuraApiConfig]]
 * 3. Taking routes from `@Routable` decorated classes ([[Routable]]) and binding those routes to Express.
 * 4. Starting and stopping the server.
 *
 * You'll want to instantiate SakuraApi and export SakuraApi then import that to anywhere that requires a reference
 * to that instance (for example [[Model]] or [[Routable]]).
 *
 * ### Example
 * <pre>
 * import {SakuraApi}       from 'sakuraapi';
 * import                   './model/user';
 * import                   'colors';
 * import * as bodyParser   from 'body-parser'
 *
 * export const sapi = new SakuraApi();
 *
 * class Server {
 *
 *    constructor() {}
 *
 *    start() {
 *        sapi.addMiddleware(bodyParser.json());
 *        sapi
 *          .listen()
 *          .catch((err) => {
 *            console.log(`Error: ${err}`.red);
 *          });
 *    }
 * }
 *
 * new Server().start();
 * </pre>
 *
 * This example assumes you have a class called `User` that is decorated with [[Routable]]. You import that module
 * even though you're not going to use it do that it kicks off the `@Routable` bootstrapping.
 */
export class SakuraApi {

  /**
   * Sets the baseUri for the entire application.
   *
   * ### Example
   * <pre>
   * sakuraApi.baseUri = '/api';
   * </pre>
   *
   * This will cause SakuraApi to expect all routes to have `api` at their base (e.g.,
   * `http://localhost:8080/api/user`).
   */
  baseUri = '/';

  // tslint:disable:variable-name
  private _address: string = '127.0.0.1';
  private _app: Express;
  private _config: any;
  private _dbConnections: SakuraMongoDbConnection;
  private _port: number = 3000;
  private _server: http.Server;
  // tslint:enable:variable-name

  private appMiddlewareAdded = false;
  private lastErrorHandlers: ErrorRequestHandler[] = [];
  private models = new Map<string, any>();
  private routables = new Map<string, any>();
  private routeQueue = new Map<string, ISakuraApiClassRoute>();

  /**
   * Returns the address of the server as a string.
   */
  get address(): string {
    return this._address;
  }

  /**
   * Returns an reference to SakuraApi's instance of Express.
   */
  get app(): Express {
    return this._app;
  }

  /**
   * Returns an instance of the Config that was automatically loaded during SakuraApi's instantiation using
   * [[SakuraApiConfig.load]]. You can also set the instance, but keep in mind that you should probably do this before
   * calling [[SakuraApi.listen]].
   */
  get config(): any {
    return this._config;
  }

  set config(config: any) {
    this._config = config;
  }

  /**
   * The [[SakuraMongoDbConnection]] instance that was created when [[SakuraApi]] instantiated if
   * the "dbConnections" property was found in the config with the proper configuration options set, or
   * if [[SakuraApi.instantiate]] was used to instantiate the [[SakuraApi]] singleton and the
   * [[SakuraMongoDbConnection]] was manually provided.
   */
  get dbConnections(): SakuraMongoDbConnection {
    return this._dbConnections;
  }

  /**
   * Returns the port the server is listening on.
   */
  get port(): number {
    return this._port;
  }

  /**
   * Returns a reference to the `http.Server` that SakuraApi is using.
   */
  get server(): http.Server {
    return this._server;
  }

  constructor(options: SakuraApiOptions) {
    debug.normal('.constructor started');

    this.config = (!options.config)
      ? new SakuraApiConfig().load(options.configPath) || {}
      : options.configPath;

    this._dbConnections = (options.dbConfig)
      ? this._dbConnections = options.dbConfig
      : this._dbConnections = SakuraApiConfig.dataSources(this.config);

    this._app = options.app || express();
    this._server = http.createServer(this.app);

    this._address = (this.config.server || {}).address || this._address;
    this._port = (this.config.server || {}).port || this._port;

    this.registerModules(options);
    this.registerModels(options);
    this.registerRoutables(options);

    debug.normal('.constructor done');
  }

  /**
   * A helper method to make it easier to add middleware. See [[SakuraApi]] for an example of its use. You could also
   * use [[SakuraApi.app]] to get a reference to Express then add your middleware with that reference directly.
   *
   * This uses `express.use(...)` internally.
   */
  addMiddleware(fn: (req: Request, res: Response, next: NextFunction) => void) {
    debug.normal('.addMiddleware called');
    this.app.use(fn);
  }

  addLastErrorHandlers(fn: ErrorRequestHandler) {
    debug.normal('.addMiddleware called');
    this.lastErrorHandlers.push(fn);
  }

  /**
   * Gracefully shuts down the server. It will not reject if the server is not running. It will, however, reject
   * with any error other than `Not running` that's returned from the `http.Server` instance.
   */
  close(): Promise<null> {
    debug.normal('.close called');

    return new Promise((resolve, reject) => {
      this
        .server
        .close((err) => {
          if (err && err.message !== 'Not running') {
            debug.normal('.close error', err);

            return reject(err);
          }

          debug.normal('.close done');
          resolve();
        });
    });
  }

  /**
   * Starts the server. You can override the settings loaded by [[SakuraApiConfig]] by passing in
   * an object that implements [[ServerConfig]].
   *
   * Connects to all the DB connections (if any) defined in [[SakuraApi.dbConnections]]. These are loaded
   * by [[SakuraApiConfig.dataSources]]. If you do not provide a "dbConnections" property in your config, or if you
   * did not instantiate SakuraApi manually with [[SakuraApi.instiate]] with a [[SakuraMongoDbConnection]] that
   * you constructed elsewhere, then no DB connections will be opened. You can also user
   * [[SakuraMongoDbConnection.connect]] to manually define Db connections.
   */
  listen(listenProperties?: ServerConfig): Promise<null> {

    return new Promise((resolve, reject) => {
      debug.route(`.listen called with serverConfig:`, listenProperties);
      debug.route(`.listen setting baseUri to ${this.baseUri}`);

      listenProperties = listenProperties || {};
      this._address = listenProperties.address || this._address;
      this._port = listenProperties.port || this._port;

      let router;
      // Add App Route Handlers ----------------------------------------------------------------------------------------
      // but only once per instance of SakuraApi
      if (!this.appMiddlewareAdded) {
        debug.route(`\t.listen first time call, adding app middleware`);

        /**
         * Catch BodyParser parse errors
         */
        this.app.use((err, req, res, next) => {
          // see: https://github.com/expressjs/body-parser/issues/238#issuecomment-294161839
          if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
            res.status(400).send({
              body: req.body,
              error: 'invalid_body'
            });
          } else {
            next(err);
          }
        });

        /**
         * Handle Response.locals injection
         */
        this.app.use((req: Request, res: Response, next: NextFunction) => {
          // inject Response.locals.body
          // inject Response.locals.response

          if (req.body && !res.locals.reqBody) {
            res.locals.reqBody = req.body;
          }
          res.locals.data = {};
          res.locals.status = 200;

          res.locals.send = (status, data): IRoutableLocals => {
            res.locals.status = status;

            if (!res.locals.data || Object.keys(res.locals.data || {}).length === 0) {
              res.locals.data = data;
              return res.locals;
            }

            // shallow merge the two objects and make sure to de-reference data
            res.locals.data = Object.assign(res.locals.data, JSON.parse(JSON.stringify(data)));
            return res.locals;
          };

          next();
        });

        /**
         * Add final error handlers
         */
        if (this.lastErrorHandlers) {
          for (const handler of this.lastErrorHandlers) {
            this.app.use(handler);
          }
        }

        /**
         * Setup route handler so that each call to listen always overwrites the prior routes -- makes testing
         * easier, there's really not a lot of reasons to be calling listen multiple times in a production app
         */
        this.app.use(this.baseUri, (req, res, next) => {
          // see: https://github.com/expressjs/express/issues/2596#issuecomment-81353034
          // hook whatever the current router is
          router(req, res, next);
        });

        this.appMiddlewareAdded = true;
      }

      // Setup @Routable routes ----------------------------------------------------------------------------------------
      router = express.Router();

      debug.route('\t.listen processing route queue');
      // add routes
      for (const route of this.routeQueue.values()) {

        debug.route('\t\t.listen route %o', route);

        let routeHandlers: Handler[] = [];

        if (route.beforeAll) {
          routeHandlers = routeHandlers.concat(route.beforeAll);
        }

        if (route.before) {
          routeHandlers = routeHandlers.concat(route.before);
        }

        routeHandlers.push(route.f);

        if (route.after) {
          routeHandlers = routeHandlers.concat(route.after);
        }

        if (route.afterAll) {
          routeHandlers = routeHandlers.concat(route.afterAll);
        }

        routeHandlers.push(resLocalsHandler);

        router[route.httpMethod](route.path, routeHandlers);
      }

      // Setup DB Connetions -------------------------------------------------------------------------------------------
      if (this.dbConnections) {
        this
          .dbConnections
          .connectAll()
          .then(() => {
            listen.bind(this)();
          })
          .catch((err) => {
            return reject(err);
          });
      } else {
        listen.bind(this)();
      }

      //////////
      function listen() {
        this
          .server
          .listen(this.port, this.address, (err) => {
            if (err) {
              debug.normal('.listen error', err);
              return reject(err);
            }

            if (listenProperties.bootMessage === undefined) {
              // tslint:disable-next-line:no-console
              console.log(`SakuraAPI started on: ${this.address}:${this.port}`.green);
            } else {
              const msg = (listenProperties.bootMessage === '')
                ? false
                : listenProperties.bootMessage;

              if (msg) {
                process.stdout.write(`${msg}`.green);
              }
            }

            debug.normal(`.listen server started ${this.address}:${this.port}`);
            return resolve();
          });
      }

      function resLocalsHandler(req: Request, res: Response, next: NextFunction) {
        if (res.headersSent) {
          return next();
        }
        res
          .status(res.locals.status || 200)
          .json(res.locals.data);

        next();
      }
    });
  }

  /**
   * Primarily used internally by [[Routable]] during bootstrapping. However, if an `@Routable` class has
   * [[RoutableClassOptions.autoRoute]] set to false, the integrator will have to pass that `@Routable` class in to
   * this method manually if he wants to routes to be bound.
   */
  enqueueRoutes(target: any) {

    debug.route(`SakuraApi.route called for %o`, target);

    if (!target[routableSymbols.routes]) {
      debug.route(`.route '%o' is not a routable class`, target);
      return;
    }

    for (const route of target[routableSymbols.routes]) {
      debug.route(`\tadded '${JSON.stringify(route)}'`);

      const routeSignature = `${route.httpMethod}:${route.path}`;
      if (this.routeQueue.get(routeSignature)) {
        throw new Error(`Duplicate route (${routeSignature}) registered by ${target.name || target.constructor.name}.`);
      }

      // used by this.listen
      this.routeQueue.set(routeSignature, route);
    }
  }

  private registerModules(options: SakuraApiOptions) {
    debug.normal('\tRegistering Modules');
    const modules = options.modules || [];

    for (const module of modules) {
      if (typeof module.module !== 'function') {
        throw new Error('SakuraApi setup error. SakuraApiOptions.module array must have objects with a module ' +
          'property that is a function, which accepts an instance of SakuraApi. The module throwing this error is ' +
          `a ${typeof module.module} rather than a function.`);
      }
      const result = module.module(this, module.options);

      this.registerModels(result);
      this.registerRoutables(result);
    }
  }

  private registerModels(options: SakuraApiOptions) {
    debug.normal('\tRegistering Models');
    const models = options.models || [];

    for (const model of models) {
      const isModel = model[modelSymbols.isSakuraApiModel];

      let modelName: string;
      let modelRef: any;

      // must be decorated with @Model or { use: SomeModel, for: SomeOriginalModel }
      if (!isModel) {
        if (!model.use
          || !model.for
          || !model.use[modelSymbols.isSakuraApiModel]
          || !model.for[modelSymbols.isSakuraApiModel]) {
          throw new Error('SakuraApi setup error. SakuraApiOptions.models array must have classes decorated with @Model'
            + ' or an object literal of the form { use: SomeMockModel, for: SomeRealModel }, where SomeMockModel and'
            + ' SomeRealModel are decorated with @Model.');
        }

        modelName = model.for.name;
        modelRef = model.use;
      } else {
        modelName = model.name;
        modelRef = model;
      }

      // set the model's instance of SakuraApi to this
      modelRef[modelSymbols.sapi] = this;

      this.models.set(modelName, modelRef);
    }
  }

  private registerRoutables(options: SakuraApiOptions) {
    debug.normal('\tRegistering Models');
    const routables = options.routables || [];

    for (const routable of routables) {

      const isRoutable = routable[routableSymbols.isSakuraApiRoutable];

      let routableName: string;
      let routableRef: string;

      // must be decorated with @Routable or { use: Routable, for: Routable }
      if (!isRoutable) {
        if (!routable.use
          || !routable.for
          || !routable.use[modelSymbols.isSakuraApiModel]
          || !routable.for[modelSymbols.isSakuraApiModel]) {
          throw new Error('SakuraApi setup error. SakuraApiOptions.routables array must have classes decorated with '
            + ' @Routable or an object literal of the form { use: SomeMockRoutable, for: SomeRealRoutable }, where'
            + ' SomeMockRoutable and SomeRealRoutable are decorated with @Model.');
        }

        routableName = routable.for.name;
        routableRef = routable.use;
      } else {
        routableName = routable.name;
        routableRef = routable;
      }

      // set the routable's instance of SakuraApi to this
      routableRef[routableSymbols.sapi] = this;

      // get the routes queued up for .listen
      this.enqueueRoutes(new (routableRef as any)());
      this.routables.set(routableName, routableRef);
    }
  }

}
