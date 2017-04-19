
# Status
|Branch     |Status     |
|-----------|-----------|
| Develop   |[![Build Status](https://travis-ci.org/sakuraapi/api.svg?branch=develop)](https://travis-ci.org/sakuraapi/api)| 
| Master    |[![Build Status](https://travis-ci.org/sakuraapi/api.svg?branch=master)](https://travis-ci.org/sakuraapi/api)|

API Documentation: https://sakuraapi.github.io/api/

# SakuraApi
SakuraAPI is a NodeJS API framework that utilizes modern and emerging webs standards like TypeScript and ES6 in a way that feels familiar to programmers that are responsible for full-stack MEAN development. 

At the moment, this project is an experiment to explore various ideas with my team.

## Goals

* Angular developers should find the conventions in SakuraApi to be familiar.
* Anyone looking at a SakuraApi based project should be able to get a quick feel for what's going on, if they're familiar with SakuraApi. The structure is opinionated enough that disparate projects will feel familiar (assuming the developer didn't go out of their way to be non-standard). 
* SakuraApi is built using modern and emerging web standards. If there is some reason your project cannot use Node 7+ or TypeScript 2+, then this isn't the right project for you. Currently there are no plans to expose a pure ECMAScript version of the framework.
* Implementing a new model or route in a SakuraApi project should be ergonomic - it shouldn't require that you remember to change settings in various files spread throughout your project. SakuraApi should, however, support a robust cascading configuration system.
* SakuraApi should encourage good API development practices through how developers implement it. In other words, using SakuraApi as intended should result in an API that's reasonably close to best practices (within the semantic domain of whatever that means).
* SakuraApi should facilitate interacting with MongoDB, but the developer should not be abstracted away from the database if he or she needs to dive deep into MongoDB land. I
  * It is the opinion of the contributors to this frameowrkMany of the database abstractions in current frameworks actually make it harder to develop because you can't use you existing knowledge of MongoDB to solve non-trivial queries. Sometimes the more advanced features of a db aren't even supported yet.
  * As a result, interacting with databases will not be treated generically - this is a MEAN stack framework, where the letter M is brought to you by MongoDB. Someone familiar with the NodeJS drivers for MongoDB should feel familiar with SakuraApi if anything non-trivial needs to be accomplished.
  * If you're looking for RDMS support (e.g., MySQL, PosgreSQL, etc.), support for some othe NoSQL database, or ______, this is likely not the API you're looking for (Jedi hand-wave).

## How to interact with others on this project:

* Open an Issue: https://github.com/sakuraapi/api/issues
* Google Forum: https://groups.google.com/forum/#!forum/sakuraapi
* Gitter: https://gitter.im/sakuraapi

This is a new tiny community, so if you don't get a response right away, it might be that we haven't noticed you rather than that we're ignoring you. Feel free to be persistent.

## Dependencies:

* TypeScript >= 2.2
* NodeJS >= 7.0

(among other things)
 
## Contributions
[![CLA assistant](https://cla-assistant.io/readme/badge/sakuraapi/api)](https://cla-assistant.io/sakuraapi/api)

* Sign the Contributor License Agreement (CLA)
* Fork the project; make your contribution (don't forget to write your unit-tests); do a pull request back to develop (pull updates frequently to not fall too far behind)
* Before heading off to work on something, considering collaborating first by either (1) opening an issue or (2) starting a conversation on gitter or in the Google forum that leads to back to (1)
* All work should be done against an issue (https://github.com/sakuraapi/api/issues)
* All contributions require unit-tests
* Use the linter (`npm run lint`) to verify you comply with the style guide
* Reset your changes to the docs/ directory before submitting changes - that directory is generated by TypeDoc and we only update it when we're releasing new updates. If you want to update the documentation, change the appropriate comments in the code.


## Bug Reporting
* An ideal bug report will include a PR with a unit-testing demonstrating the bug. TDBR (test driven bug reporting). :)
* Feel free to open an issue before you start working on a PR to prove / demonstrate your bug report, but please close that ticket if you find that your bug was an error on your side

## Community and Conduct

Everyone should be treated with respect. Though candor is encouraged, being mean will not be tolerated. We're a MEAN stack, not a mean stack.

## What's with the name?

[J.P.](https://github.com/etsuo) is half Japanese and he has fond memories of cherry blossoms in Japan... he also likes sakura mochi. No, he doesn't speak Japanese, much to his mother's disappointment.

# Working with the SakuraApi codebase

```
npm install
npm test
```

It's a framework / library, so there isn't an `npm start`. You can look at the [starter](https://github.com/sakuraapi/example) project to get an ostensive feel for how the api is used.

SakuraApi uses Docker for testing, so you need to have a Docker installed if you plan to contribute.

If you need to override where the tests look for MongoDB, you can override the port like this:
```
TEST_MONGO_DB_PORT=27001 npm run test
```

You override the address with TEST_MONGO_DB_ADDRESS like this:
```
TEST_MONGO_DB_ADDRESS=0.0.0.0 npm run test
```

That said, you really should be using the project's docker setup for testing.

# Who should use this API?

Anyone who's ok with the changing API until the project reaches 1.0. Anyone who's open to reporting bugs. Anyone who thinks this adds value to whatever it is they're working on.

Though this API is not being developed for or by Olive Technology, Inc. Olive Technology has been kind enough to allow a few of us to spend some of our time contributing to this project towards meeting the needs of some of their client projects. This does not imply in any way that Olive Technology has any claim to the intellectual properties of this project or that Olive Technology has any special licensing rights. It's BSD all around. ;)

# environment

SakuraApi looks for a `config/` folder in the root of your api project.

It cascades the values found in the following order (the last taking precedence over the former):

1. environment.json
1. environment.ts
1. environment.{env}.json
1. environment.{env}.ts
1. system environmental variables

Where `{env}` is replaced by what's set in the environmental variable `NODE_ENV`. For example, if your set
`NODE_ENV=dev` when you start your server, the system will load:

1. environment.json
1. environment.ts
1. environment.dev.json
1. environment.dev.ts
1. system environmental variables

## config

There are some properties in the environmental config that are used by the system if they're present:

```
{
  server: {
    address: string,      // '127.0.0.1'
    port: number          // 3000
  }
}
```
Naturally, anything you define is available to you. You get access to the configuration through `SakuraApi.instsance.config`.

# Using SakuraAPI

See the [SakuraAPI Example](https://github.com/sakuraapi/api-example) project for a demonstration of how to use the API.
