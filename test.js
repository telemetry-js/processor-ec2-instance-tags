'use strict'

const test = require('tape')
const proxyquire = require('proxyquire')
const uppercase = (key) => key.toUpperCase()

const infoSpies = []
const ec2Spies = []
const describeTagsSpies = []

const plugin = proxyquire('.', {
  'ec2-info': function (...args) {
    infoSpies.shift()(...args)
  },
  'aws-sdk': {
    EC2: function (...args) {
      ec2Spies.shift()(...args)

      return {
        describeTags: function (...args) {
          describeTagsSpies.shift()(...args)
        }
      }
    }
  }
})

test('basic', function (t) {
  t.plan(8)

  infoSpies.push((properties, callback) => {
    t.same(properties, ['meta-data/instance-id', 'dynamic/instance-identity/document'])

    process.nextTick(callback, null, new Map([
      ['meta-data/instance-id', 'fake_id'],
      ['dynamic/instance-identity/document', JSON.stringify({
        region: 'fake_region'
      })]
    ]))
  })

  ec2Spies.push((opts) => {
    t.same(opts, { apiVersion: '2016-04-01', region: 'fake_region' })
  })

  describeTagsSpies.push((params, callback) => {
    t.same(params, {
      MaxResults: 10,
      Filters: [
        { Name: 'resource-id', Values: ['fake_id'] },
        { Name: 'resource-type', Values: ['instance'] }
      ]
    })

    process.nextTick(callback, null, {
      Tags: [
        { ResourceId: 'fake_id', Key: 'a_A', Value: 'a' },
        { ResourceId: 'fake_id', Key: 'b', Value: 'b' },
        { ResourceId: 'fake_id', Key: 'c', Value: 'c' }
      ]
    })
  })

  const p = plugin({ filter: (k) => k !== 'b' })
  const metric = { tags: { existing: '1' } }

  p.start((err) => {
    t.ifError(err, 'no start error')
    t.is(infoSpies.length, 0, 'ec2-info called')
    t.is(ec2Spies.length, 0, 'ec2 called')
    t.is(describeTagsSpies.length, 0, 'describeTags called')

    p.on('metric', (metric) => {
      t.same(metric, {
        tags: {
          existing: '1',
          aa: 'a',
          c: 'c'
        }
      })
    })

    p.process(metric)
  })
})

test('include option', function (t) {
  t.plan(8)

  infoSpies.push((properties, callback) => {
    t.same(properties, ['meta-data/instance-id', 'dynamic/instance-identity/document'])

    process.nextTick(callback, null, new Map([
      ['meta-data/instance-id', 'fake_id'],
      ['dynamic/instance-identity/document', JSON.stringify({
        region: 'fake_region'
      })]
    ]))
  })

  ec2Spies.push((opts) => {
    t.same(opts, { apiVersion: '2016-04-01', region: 'fake_region' })
  })

  describeTagsSpies.push((params, callback) => {
    t.same(params, {
      MaxResults: 10,
      Filters: [
        { Name: 'resource-id', Values: ['fake_id'] },
        { Name: 'resource-type', Values: ['instance'] }
      ]
    })

    process.nextTick(callback, null, {
      Tags: [
        { ResourceId: 'fake_id', Key: 'a_A', Value: 'a' },
        { ResourceId: 'fake_id', Key: 'b', Value: 'b' },
        { ResourceId: 'fake_id', Key: 'c', Value: 'c' }
      ]
    })
  })

  const p = plugin({ include: ['aa', 'c'] })
  const metric = { tags: { existing: '1' } }

  p.start((err) => {
    t.ifError(err, 'no start error')
    t.is(infoSpies.length, 0, 'ec2-info called')
    t.is(ec2Spies.length, 0, 'ec2 called')
    t.is(describeTagsSpies.length, 0, 'describeTags called')

    p.on('metric', (metric) => {
      t.same(metric, {
        tags: {
          existing: '1',
          aa: 'a',
          c: 'c'
        }
      })
    })

    p.process(metric)
  })
})

test('custom case', function (t) {
  t.plan(5)

  infoSpies.push((properties, callback) => {
    t.same(properties, ['meta-data/instance-id', 'dynamic/instance-identity/document'])

    process.nextTick(callback, null, new Map([
      ['meta-data/instance-id', 'fake_id'],
      ['dynamic/instance-identity/document', JSON.stringify({
        region: 'fake_region'
      })]
    ]))
  })

  ec2Spies.push((opts) => {
    t.same(opts, { apiVersion: '2016-04-01', region: 'fake_region' })
  })

  describeTagsSpies.push((params, callback) => {
    t.same(params, {
      MaxResults: 10,
      Filters: [
        { Name: 'resource-id', Values: ['fake_id'] },
        { Name: 'resource-type', Values: ['instance'] }
      ]
    })

    process.nextTick(callback, null, {
      Tags: [
        { ResourceId: 'fake_id', Key: 'a_A', Value: 'a' },
        { ResourceId: 'fake_id', Key: 'b', Value: 'b' },
        { ResourceId: 'fake_id', Key: 'c', Value: 'c' }
      ]
    })
  })

  const p = plugin({ case: uppercase, filter: (k) => k !== 'B' })
  const metric = { tags: { existing: '1' } }

  p.start((err) => {
    t.ifError(err, 'no start error')

    p.on('metric', (metric) => {
      t.same(metric, {
        tags: {
          existing: '1',
          A_A: 'a',
          C: 'c'
        }
      })
    })

    p.process(metric)
  })
})

test('cached', function (t) {
  t.plan(7)

  infoSpies.push((properties, callback) => {
    t.pass('called only once')

    process.nextTick(callback, null, new Map([
      ['meta-data/instance-id', 'fake_id'],
      ['dynamic/instance-identity/document', JSON.stringify({
        region: 'fake_region'
      })]
    ]))
  })

  ec2Spies.push((opts) => {
    t.pass('called only once')
  })

  describeTagsSpies.push((params, callback) => {
    t.pass('called only once')

    process.nextTick(callback, null, {
      Tags: [
        { ResourceId: 'fake_id', Key: 'a_A', Value: 'a' },
        { ResourceId: 'fake_id', Key: 'b', Value: 'b' },
        { ResourceId: 'fake_id', Key: 'c', Value: 'c' }
      ]
    })
  })

  const p1 = plugin.cached({ filter: (k) => k !== 'b' })
  const p2 = plugin.cached({ filter: (k) => k !== 'A_A', case: (k) => k.toUpperCase() })

  p1.start((err) => {
    t.ifError(err, 'no start error')

    p1.on('metric', (metric) => {
      t.same(metric, {
        tags: {
          existing: '1',
          aa: 'a',
          c: 'c'
        }
      }, 'p1 tags ok')
    })

    p1.process({ tags: { existing: '1' } })
  })

  p2.start((err) => {
    t.ifError(err, 'no start error')

    p2.on('metric', (metric) => {
      t.same(metric, {
        tags: {
          existing: '1',
          B: 'b',
          C: 'c'
        }
      }, 'p2 tags ok')
    })

    p2.process({ tags: { existing: '1' } })
  })
})
