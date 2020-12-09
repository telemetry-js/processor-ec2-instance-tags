# processor-ec2-instance-tags

> **Copy tags of EC2 instance to metrics.**  
> A [`telemetry`](https://github.com/telemetry-js/telemetry) plugin.

[![npm status](http://img.shields.io/npm/v/@telemetry-js/processor-ec2-instance-tags.svg)](https://www.npmjs.org/package/@telemetry-js/processor-ec2-instance-tags)
[![node](https://img.shields.io/node/v/@telemetry-js/processor-ec2-instance-tags.svg)](https://www.npmjs.org/package/@telemetry-js/processor-ec2-instance-tags)
[![Test](https://github.com/telemetry-js/processor-ec2-instance-tags/workflows/Test/badge.svg?branch=main)](https://github.com/telemetry-js/processor-ec2-instance-tags/actions)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Table of Contents

<details><summary>Click to expand</summary>

- [Usage](#usage)
- [Options](#options)
- [Cached variant](#cached-variant)
- [Install](#install)
- [Acknowledgements](#acknowledgements)
- [License](#license)

</details>

## Usage

```js
const telemetry = require('@telemetry-js/telemetry')()
const tags = require('@telemetry-js/processor-ec2-instance-tags')

telemetry.task()
  .process(tags)

// Or with options
telemetry.task()
  .process(tags, { include: ['name', 'version'] })
```

## Options

- `case`: optional function to normalize a tag. E.g. `(key) => key.toLowerCase()`. The default behavior is to lowercase the key and strip any characters outside of `[a-z0-9]`. If the EC2 instance has a `Project` tag for example, metrics will be tagged with `project`.
- `include`: optional array of tags to include, normalized. E.g. `['project']`. By default all tags are included.
- `filter`: optional function to filter tags. E.g. `(key) => key === 'project'`. Takes precedence over `options.include`.

## Cached variant

By default, each instance of this plugin fetches EC2 instance metadata and tags itself. To only fetch once (with a semiglobal cache) use:

```js
const tags = require('@telemetry-js/processor-ec2-instance-tags').cached
```

## Install

With [npm](https://npmjs.org) do:

```
npm install @telemetry-js/processor-ec2-instance-tags
```

## Acknowledgements

This project is kindly sponsored by [Reason Cybersecurity Ltd](https://reasonsecurity.com).

[![reason logo](https://cdn.reasonsecurity.com/github-assets/reason_signature_logo.png)](https://reasonsecurity.com)

## License

[MIT](LICENSE) © Vincent Weevers
