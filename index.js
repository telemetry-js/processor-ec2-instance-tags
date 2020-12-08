'use strict'

const EventEmitter = require('events').EventEmitter
const ec2Info = require('ec2-info')
const EC2 = require('aws-sdk').EC2
const thunky = require('thunky')
const nocase = (key) => key.toLowerCase().replace(/[^a-z0-9]+/g, '')
const identity = (key) => key

const INFO_ID = 'meta-data/instance-id'
const INFO_DOC = 'dynamic/instance-identity/document'

function plugin (options) {
  return new Processor(options)
}

// TODO (later): should this be the default behavior?
plugin.cached = function (options) {
  return plugin(Object.assign({}, options, { cache: true }))
}

const fetchData = function (callback) {
  ec2Info([INFO_ID, INFO_DOC], (err, map) => {
    if (err) return callback(err)

    const id = map.get(INFO_ID)
    const doc = map.get(INFO_DOC)

    try {
      var region = JSON.parse(doc).region
    } catch (err) {
      return callback(err)
    }

    if (typeof id !== 'string' || id === '') {
      return callback(new TypeError('Instance ID must be a non-empty string'))
    } else if (typeof region !== 'string' || region === '') {
      return callback(new TypeError('Region must be a non-empty string'))
    }

    const params = {
      MaxResults: 10,
      Filters: [
        { Name: 'resource-id', Values: [id] },
        { Name: 'resource-type', Values: ['instance'] }
      ]
    }

    new EC2({ apiVersion: '2016-04-01', region }).describeTags(params, (err, data) => {
      if (err) return callback(err)

      const tags = {}

      for (const tag of data.Tags) {
        if (tag.ResourceId !== id) {
          return callback(new Error('Unexpected Instance ID'))
        }

        tags[tag.Key] = tag.Value === undefined ? 'true' : String(tag.Value)
      }

      callback(null, tags)
    })
  })
}

const fetchDataCached = thunky(fetchData)

module.exports = plugin

class Processor extends EventEmitter {
  constructor (options) {
    if (!options) options = {}
    super()

    this._tags = null
    this._case = options.case || nocase
    this._fetch = (options && options.cache ? fetchDataCached : fetchData).bind(null)

    if (typeof options.filter === 'function') {
      this._filter = options.filter
    } else if (options.filter) {
      throw new TypeError('The "filter" option must be a function')
    } else if (Array.isArray(options.include)) {
      const keys = new Set(options.include)
      this._filter = (k) => keys.has(k)
    } else if (options.include) {
      throw new TypeError('The "include" option must be an array')
    } else {
      // TODO (!): skip "author" and "owner" by default?
      this._filter = identity
    }
  }

  start (callback) {
    this._tags = {}

    // TODO (later): periodically refetch tags? because they can change
    this._fetch((err, tags) => {
      if (err) return callback(err)

      for (const rawKey in tags) {
        const key = this._case(rawKey)

        if (key !== '' && this._filter(key)) {
          this._tags[key] = tags[rawKey]
        }
      }

      callback()
    })
  }

  stop (callback) {
    this._tags = null
    process.nextTick(callback)
  }

  process (metric) {
    for (const k in this._tags) {
      metric.tags[k] = this._tags[k]
    }

    this.emit('metric', metric)
  }
}
