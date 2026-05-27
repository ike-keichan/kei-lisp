import type { InterpretedSymbol } from '../../value/InterpretedSymbol/index.js';

type Stream = NodeJS.WritableStream | null;

/**
 * @class
 * @classdesc Manages output streams (stdout / stderr / spy / trace) used by the interpreter.
 * @author Keisuke Ikeda
 * @this {StreamManager}
 */
export class StreamManager extends Object {
  /**
   * Whether tracing is currently enabled.
   */
  isTrace: boolean = false;
  /**
   * Map from a named stream key (e.g. "default", "stdout", "stderr") to a WritableStream.
   */
  streamTable: Map<string, Stream>;
  /**
   * Map from a spied symbol to the stream key used for that symbol's output.
   */
  spyTable: Map<InterpretedSymbol, string>;
  /**
   * The stream that receives trace output while tracing is on.
   */
  traceStream: Stream;

  /**
   * Constructor.
   * @constructor
   */
  constructor() {
    super();
    this.streamTable = new Map();
    this.spyTable = new Map();
    this.traceStream = null;
    this.initialize();
  }

  /**
   * Returns the currently selected output stream (trace stream when tracing, otherwise the default).
   * @return the active stream, or null when none is available
   */
  getStream(): Stream {
    let aPrintStream: Stream = null;
    if (this.isTrace) {
      // Following the original: traceStream is invoked as a function (since it is a Stream object this throws).
      return (this.traceStream as unknown as () => Stream)();
    }
    const filePath = process.env['HOME'] as string;
    if (this.streamTable.has(filePath)) {
      aPrintStream = this.streamTable.get(filePath) ?? null;
    }

    return aPrintStream;
  }

  /**
   * Initializes the instance variables.
   * @return null
   */
  initialize(): null {
    this.streamTable.set('default', process.stdout);
    this.streamTable.set('stdout', process.stdout);
    this.streamTable.set('stderr', process.stderr);

    return null;
  }

  /**
   * Returns whether the given symbol is being spied (or whether tracing is on, in which case every symbol is "spied").
   * @param aSymbol the symbol to check, or null
   * @return true if the symbol is spied or tracing is on
   */
  isSpy(aSymbol: InterpretedSymbol | null): boolean {
    if (this.isTrace) {
      return true;
    }
    if (aSymbol != null && this.spyTable_().has(aSymbol)) {
      return true;
    }
    return false;
  }

  /**
   * Removes the given symbol from the spy table.
   * @param aSymbol the symbol to stop spying
   * @return null
   */
  noSpy(aSymbol: InterpretedSymbol): null {
    if (this.spyTable_().has(aSymbol)) {
      this.spyTable_().delete(aSymbol);
    }

    return null;
  }

  /**
   * Turns tracing off and clears the spy table.
   * @return null
   */
  noTrace(): null {
    this.setIsTrace(false);
    this.spyTable.clear();

    return null;
  }

  /**
   * Sets the tracing flag.
   * @param aBoolean the new value for the tracing flag
   * @return null
   */
  setIsTrace(aBoolean: boolean): null {
    this.isTrace = aBoolean;
    return null;
  }

  /**
   * Sets the trace output stream.
   * @param aStream the stream to send trace output to
   * @return null
   */
  setTraceStream(aStream: Stream): null {
    this.traceStream = aStream;
    return null;
  }

  /**
   * Registers the given symbol as spied with the given stream key.
   * @param aSymbol the symbol to spy on
   * @param aString the stream key (e.g. "default")
   * @return null
   */
  spy(aSymbol: InterpretedSymbol, aString: string): null {
    const aPrintStream = this.getStream();
    if (aPrintStream != null) {
      this.spyTable_().set(aSymbol, aString);
    }

    return null;
  }

  /**
   * Returns the stream (or stream-key string) used for the given symbol's spy output.
   * @param aSymbol the symbol whose spy stream is requested, or null
   * @return the trace stream, the registered key string, or throws if none is found
   */
  spyStream(aSymbol: InterpretedSymbol | null): Stream | string {
    if (this.isTrace) {
      return this.traceStream;
    }
    if (aSymbol != null && this.spyTable_().has(aSymbol)) {
      return this.spyTable_().get(aSymbol) as string;
    }
    throw new Error('Stream is not found.');
  }

  /**
   * Returns a copy of the spy table (defensive copy so callers do not mutate the internal map).
   * @return a new map containing the same entries as the internal spy table
   */
  spyTable_(): Map<InterpretedSymbol, string> {
    const aTable = new Map<InterpretedSymbol, string>();
    for (const [key, value] of this.spyTable) {
      aTable.set(key, value);
    }
    return aTable;
  }

  /**
   * Turns tracing on, routing trace output to the currently active stream.
   * @return null
   */
  trace(): null {
    this.noTrace();
    const aPrintStream = this.getStream();
    this.setTraceStream(aPrintStream);
    this.setIsTrace(true);

    return null;
  }
}
