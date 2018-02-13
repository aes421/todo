const payloads = require('./fixtures/payloads')
const {gimmeRobot} = require('./helpers')

describe('open-issues', () => {
  it('requests issues for the repo', async () => {
    const {robot, github} = gimmeRobot()
    await robot.receive(payloads.basic)
    expect(github.search.issues).toHaveBeenCalledTimes(1)
  })

  it('creates an issue', async () => {
    const {robot, github} = gimmeRobot()
    await robot.receive(payloads.basic)
    expect(github.issues.create).toHaveBeenCalledTimes(1)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
  })

  it('creates an issue that has special characters', async () => {
    const {robot, github} = gimmeRobot()
    await robot.receive(payloads.special)
    expect(github.issues.create).toHaveBeenCalledTimes(1)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
  })

  it('creates an issue with multiple keywords', async () => {
    const {robot, github} = gimmeRobot('multipleKeywords.yml')
    await robot.receive(payloads.basic)
    expect(github.issues.create).toHaveBeenCalledTimes(1)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
  })

  it('creates multiple issues with multiple keywords', async () => {
    const {robot, github} = gimmeRobot('multipleKeywords.yml')
    await robot.receive(payloads.multiple)
    expect(github.issues.create).toHaveBeenCalledTimes(2)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
    expect(github.issues.create.mock.calls[1]).toMatchSnapshot()
  })

  it('creates an issue with a truncated title', async () => {
    const {robot, github} = gimmeRobot()
    await robot.receive(payloads.long)
    expect(github.issues.create).toHaveBeenCalledTimes(1)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
  })

  it('creates an issue without assigning anyone', async () => {
    const {robot, github} = gimmeRobot('autoAssignFalse.yml')
    await robot.receive(payloads.basic)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
  })

  it('creates an issue and assigns the configured user', async () => {
    const {robot, github} = gimmeRobot('autoAssignString.yml')
    await robot.receive(payloads.basic)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
  })

  it('creates an issue and assigns the configured users', async () => {
    const {robot, github} = gimmeRobot('autoAssignArr.yml')
    await robot.receive(payloads.basic)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
  })

  it('creates an issue adds an array of labels', async () => {
    const {robot, github} = gimmeRobot('labelArr.yml')
    await robot.receive(payloads.basic)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
  })

  it('works with a complex push (with multiple commits)', async () => {
    const {robot, github} = gimmeRobot()
    await robot.receive(payloads.complex)
    expect(github.issues.create).toHaveBeenCalledTimes(3)
  })

  it('respects the capitalization config', async () => {
    const {robot, github} = gimmeRobot('caseSensitive.yml')
    await robot.receive(payloads.complex)
    expect(github.issues.create).toHaveBeenCalledTimes(1)
  })

  it('does not create any issues', async () => {
    const {robot, github} = gimmeRobot('caseSensitivePizza.yml')
    await robot.receive(payloads.complex)
    expect(github.issues.create).toHaveBeenCalledTimes(0)
  })

  it('does nothing on a merge commit', async () => {
    const {robot, github} = gimmeRobot()
    github.gitdata.getCommit.mockReturnValueOnce(Promise.resolve({
      data: { parents: [1, 2] }
    }))
    await robot.receive(payloads.basic)
    expect(github.issues.create).toHaveBeenCalledTimes(0)
  })

  it('does not create an issue that already exists', async () => {
    const {robot, github} = gimmeRobot('existing.yml')
    await robot.receive(payloads.complex)
    expect(github.issues.create).toHaveBeenCalledTimes(0)
  })

  it('does not create a duplicate issue after creating one', async () => {
    const {robot, github} = gimmeRobot('basic.yml', {data: {total_count: 0, items: []}})
    await robot.receive(payloads.basic)
    expect(github.issues.create).toHaveBeenCalledTimes(1)

    const issue = {data: {total_count: 1, items: [{ title: 'Jason!', state: 'open', body: `\n\n<!-- probot = {"10000":{"title": "Jason!","file": "index.js"}} -->` }]}}
    github.search.issues.mockReturnValue(Promise.resolve(issue))

    await robot.receive(payloads.basic)
    expect(github.issues.create).toHaveBeenCalledTimes(1)
  })

  it('works without a config present', async () => {
    const {robot, github} = gimmeRobot(false)
    await robot.receive(payloads.basic)
    expect(github.issues.create).toHaveBeenCalledTimes(1)
  })

  it('creates 33 issues', async () => {
    const {robot, github} = gimmeRobot()
    await robot.receive(payloads.many)
    expect(github.issues.create).toHaveBeenCalledTimes(33)
  })

  it('works with issues with empty bodies', async () => {
    const {robot, github} = gimmeRobot('basic.yml', {data: { items: [{ title: 'Hey', state: 'open' }], total_count: 1 }})
    await robot.receive(payloads.basic)
    expect(github.issues.create).toHaveBeenCalledTimes(1)
  })

  it('parses titles and respects case-insensitive', async () => {
    const {robot, github} = gimmeRobot()
    await robot.receive(payloads.caseinsensitive)
    expect(github.issues.create.mock.calls[0]).toMatchSnapshot()
  })

  it('does not throw errors when head_commit is null', async () => {
    const {robot, github} = gimmeRobot()
    await robot.receive(payloads.merge)
    expect(github.issues.create).toHaveBeenCalledTimes(0)
  })

  it('ignores the config file', async () => {
    const {robot, github} = gimmeRobot()
    await robot.receive(payloads.configFile)
    expect(github.issues.create).toHaveBeenCalledTimes(0)
  })

  it('throws when the tree is too large', async () => {
    const {robot, github} = gimmeRobot()
    robot.log.error = jest.fn()
    github.gitdata.getTree.mockReturnValueOnce({ truncated: true })
    await robot.receive(payloads.basic)
    expect(robot.log.error).toHaveBeenCalledWith(new Error('Tree was too large for one recursive request.'))
    expect(github.issues.create).toHaveBeenCalledTimes(0)
  })

  it('reopens a closed issue', async () => {
    const issues = {data: {
      items: [{
        title: 'An issue that exists',
        state: 'open',
        body: `\n\n<!-- probot = {"10000":{"title": "An issue that exists","file": "index.js"}} -->`
      }, {
        title: 'Jason!',
        state: 'closed',
        body: `\n\n<!-- probot = {"10000":{"title": "Jason!","file": "index.js"}} -->`
      }],
      total_count: 2
    }}
    const {robot, github} = gimmeRobot('basic.yml', issues)
    await robot.receive(payloads.basic)
    expect(github.issues.edit).toHaveBeenCalledTimes(1)
    expect(github.issues.createComment).toHaveBeenCalledTimes(1)
    expect(github.issues.create).toHaveBeenCalledTimes(0)
  })

  it('skips the search if if there are no issues', async () => {
    const issues = {data: {
      items: [],
      total_count: 0
    }}
    const {robot, github} = gimmeRobot('basic.yml', issues)
    await robot.receive(payloads.basic)
    expect(github.issues.createComment).toHaveBeenCalledTimes(0)
    expect(github.issues.create).toHaveBeenCalledTimes(1)
  })

  it('respects the reopenClosed config', async () => {
    const issues = {data: {
      items: [{
        title: 'An issue that exists',
        state: 'open',
        body: `\n\n<!-- probot = {"10000":{"title": "An issue that exists","file": "index.js"}} -->`
      }, {
        title: 'Jason!',
        state: 'closed',
        body: `\n\n<!-- probot = {"10000":{"title": "Jason!","file": "index.js"}} -->`
      }],
      total_count: 2
    }}
    const {robot, github} = gimmeRobot('reopenClosedFalse.yml', issues)
    await robot.receive(payloads.basic)
    expect(github.issues.edit).toHaveBeenCalledTimes(0)
    expect(github.issues.createComment).toHaveBeenCalledTimes(0)
    expect(github.issues.create).toHaveBeenCalledTimes(0)
  })
})