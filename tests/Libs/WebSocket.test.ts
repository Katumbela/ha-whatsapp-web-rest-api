import mockLogger from '../stubs/Logger'
import mockEventBus from '../stubs/EventBus'
import WebSocket from '../../src/Libs/WebSocket'
import Logger from '../../src/Libs/Logger'
import { IQRCodeEvent } from '../../src/Libs/Whatsapp'
import httpServer from 'http'

const mockOn = jest.fn()
const mockEmit = jest.fn()
// mock client
jest.mock('socket.io', () => {
    return {
        Server: jest.fn().mockImplementation(() => {
            return {
                on: mockOn,
                emit: mockEmit
            }
        })
    }
})

jest.mock('http')

beforeEach(() => {
    jest.clearAllMocks()
})

describe('WebSocket tests', () => {
    it('start socket', async () => {
        const http = httpServer.createServer()
        const websocket = new WebSocket(http, new Logger(), mockEventBus)
        websocket.start()

        expect(mockLogger.info).toHaveBeenCalledWith('Starting WebSocket')
        expect(mockOn).toHaveBeenCalledWith('connection', expect.any(Function))
    })

    it('onConnection', async () => {
        const http = httpServer.createServer()
        const websocket = new WebSocket(http, new Logger(), mockEventBus)
        websocket.start()

        const mockSocket = {
            id: '123',
            emit: jest.fn(),
            on: jest.fn()
        }

        const onConnection = mockOn.mock.calls[0][1]
        onConnection(mockSocket)

        expect(mockLogger.info).toHaveBeenCalledWith('New connection from 123')
        expect(mockEventBus.dispatch).toHaveBeenCalledWith('socket.connection', mockSocket)

        // mock eventbus whatsapp.qr event
        expect(mockEventBus.register).toHaveBeenCalledWith('whatsapp.qr', expect.any(Function))

        const mockQr = 'mockQr'
        const onQr = mockEventBus.register.mock.calls.find((call) => call[0] === 'whatsapp.qr')[1]
        const event: IQRCodeEvent = {
            qr: mockQr
        }

        onQr(event)
        // expect(mockSocket.emit).toHaveBeenCalledWith('qr_code', { data: mockQr })

        const onDisconnect = mockSocket.on.mock.calls[0][1]
        onDisconnect('reason')
        expect(mockLogger.info).toHaveBeenCalledWith('Disconnect from 123, reason: reason')
        expect(mockEventBus.dispatch).toHaveBeenCalledWith('socket.disconnect', mockSocket)
    })

    it('onMessage', async () => {
        const http = httpServer.createServer()
        const websocket = new WebSocket(http, new Logger(), mockEventBus)
        websocket.start()

        const mockData = { message: { id: 'id', rawData: { id: 'id' } } }
        const onMessage = mockEventBus.register.mock.calls.find((call) => call[0] === 'whatsapp.message')[1]
        onMessage(mockData)
        expect(mockEmit).toHaveBeenCalledWith('message', mockData.message.rawData)
    })

    it('onCreatedMessage', async () => {
        const http = httpServer.createServer()
        const websocket = new WebSocket(http, new Logger(), mockEventBus)
        websocket.start()

        const mockData = { message: { id: 'id', rawData: { id: 'id' } } }
        const onCreatedMessage = mockEventBus.register.mock.calls.find((call) => call[0] === 'whatsapp.message.create')[1]
        onCreatedMessage(mockData)
        expect(mockEmit).toHaveBeenCalledWith('message.create', mockData.message.rawData)
    })

    it('onMessageAck', async () => {
        const http = httpServer.createServer()
        const websocket = new WebSocket(http, new Logger(), mockEventBus)
        websocket.start()

        const mockMessage = { message: { id: 'id', rawData: { id: 'id' } }, ack: 1 }
        const onMessageAck = mockEventBus.register.mock.calls.find((call) => call[0] === 'whatsapp.message.ack')[1]
        onMessageAck(mockMessage)
        expect(mockEmit).toHaveBeenCalledWith('message.ack', { message: mockMessage.message.rawData, ack: mockMessage.ack })
    })
})
