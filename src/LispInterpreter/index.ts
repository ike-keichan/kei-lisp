import { createRequire } from 'node:module';
import type { Interface as ReadlineInterface } from 'node:readline';

import { Cons, type LispValue } from '../Cons/index.js';
import { Evaluator } from '../Evaluator/index.js';
import { ExitError } from '../ExitError/index.js';
import { InterpretedSymbol } from '../InterpretedSymbol/index.js';
import { StreamManager } from '../StreamManager/index.js';
import { Table } from '../Table/index.js';

const require = createRequire(import.meta.url);

/**
 * @class
 * @classdesc インタプリタのクラス
 * @author Keisuke Ikeda
 * @this {LispInterpreter}
 */
export class LispInterpreter {
  root: Table;
  streamManager: StreamManager;
  rl: ReadlineInterface;

  constructor() {
    this.root = this.initializeTable();
    this.streamManager = new StreamManager();

    const readline = require('node:readline') as typeof import('node:readline');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '>> ',
    });
  }

  /**
   * インタプリタの起動メソッド
   */
  run(): null {
    let aCons: LispValue = new Cons();
    let aString = '';
    let leftParentheses = 0;
    let exitedViaLisp = false;

    this.rl.prompt();
    this.rl
      .on('line', (line: string) => {
        line += ' ';

        for (const aCharacter of line) {
          if (aCharacter === '(') {
            leftParentheses++;
          }
          if (aCharacter === ')') {
            leftParentheses--;
          }
          aString += aCharacter;
        }

        if (leftParentheses <= 0) {
          aCons = this.parse(aString);
          try {
            for (const each of (aCons as Cons).loop()) {
              console.log((this.eval(each) as { toString(): string }).toString());
            }
          } catch (error) {
            if (error instanceof ExitError) {
              exitedViaLisp = true;
              this.rl.close();
              return;
            }
            console.log('*** can not eval ' + (aCons as Cons).toString() + ' ***');
            console.log(Cons.nil.toString());
          }
          leftParentheses = 0;
          aString = '';
          this.rl.prompt();
        }
      })
      .on('close', () => {
        // (exit) 経由の場合は Evaluator.exit() が既に "Bye!" を出力しているためスキップ
        if (!exitedViaLisp) {
          console.log('\nBye!');
        }
      });

    return null;
  }

  /**
   * 引数のリストを評価し、評価値を応答するメソッド
   */
  eval(aCons: LispValue): LispValue {
    try {
      return Evaluator.eval(aCons, this.root, this.streamManager);
    } catch (error) {
      if (error instanceof ExitError) throw error;
      console.log('*** can not eval ' + (aCons as { toString(): string }).toString() + ' ***');
      return Cons.nil;
    }
  }

  /**
   * ソース文字列をパースし、含まれる全ての式を評価して結果を配列で応答するメソッド
   */
  evalAll(source: string): LispValue[] {
    const ast = this.parse(source);
    const results: LispValue[] = [];
    if (Cons.isCons(ast)) {
      for (const expr of ast.loop()) {
        results.push(this.eval(expr));
      }
    }
    return results;
  }

  /**
   * ソース文字列をパースし評価した上で、最後の式の評価値を応答するメソッド
   */
  evalString(source: string): LispValue {
    const results = this.evalAll(source);
    return results.length === 0 ? Cons.nil : (results.at(-1) ?? Cons.nil);
  }

  /**
   * 引数の文字列をパースし、リストにして応答するメソッド
   */
  parse(aString: string): LispValue {
    try {
      return Cons.parse('(' + aString + '\n);');
    } catch {
      console.log('*** can not parse ' + aString.replaceAll('\n', '') + ' ***');
      return Cons.nil;
    }
  }

  /**
   * 指定された環境を環境の根として設定する.
   */
  setRoot(environment: Table): null {
    if (environment instanceof Table) {
      environment.setRoot(true);
      this.root = environment;
    }

    return null;
  }

  /**
   * 環境のテーブルを初期化するメソッド
   */
  initializeTable(): Table {
    const aList: string[] = [];
    const aTable = new Table();
    aTable.setRoot(true);

    aList.push(
      'abs',
      'add',
      'and',
      'apply',
      'assoc',
      'atom',
      'bind',
      'car',
      'cdr',
      'characterp',
      'clear',
      'cond',
      'cons',
      'consp',
      'copy',
      'cos',
      'floatp',
      'defun',
      'divide',
      'do',
      'do*',
      'dolist',
      'doublep',
      'eq',
      'equal',
      'exit',
      'exp',
      'gc',
      'gensym',
      'if',
      'integerp',
      'lambda',
      'let',
      'let*',
      'last',
      'list',
      'listp',
      'mapcar',
      'member',
      'memq',
      'mod',
      'multiply',
      'napier',
      'neq',
      'nequal',
      'not',
      'notrace',
      'nth',
      'null',
      'numberp',
      'or',
      'pi',
      'pop',
      'progn',
      'printc',
      'print',
      'push',
      'quote',
      'random',
      'reload',
      'round',
      'rplaca',
      'rplacd',
      'setq',
      'set-allq',
      'sin',
      'sqrt',
      'subtract',
      'stringp',
      'symbolp',
      'tan',
      'terpri',
      'time',
      'trace',
      'unless',
      'when',
      '+',
      '-',
      '*',
      '/',
      '//',
      '=',
      '==',
      '~=',
      '~~',
      '<',
      '<=',
      '>',
      '>=',
    );

    for (const each of aList) {
      const aSymbol = InterpretedSymbol.of(each);
      aTable.set(aSymbol, aSymbol);
    }

    let aString: string;
    let aCons: Cons;
    aString =
      '(lambda (list1 list2) (cond ((null (listp list1)) nil) ((null (listp list2)) nil) ((null list1) list2) (t (cons (car list1) (append (cdr list1) list2)))))';
    aCons = Cons.parse(aString) as Cons;
    aCons.last().setCdr(new Cons(aTable, Cons.nil));
    aTable.set(InterpretedSymbol.of('append'), aCons);

    aString =
      '(lambda (l n) (cond ((<= (length l) n) nil) (t (cons (car l) (butlast (cdr l) n)))))';
    aCons = Cons.parse(aString) as Cons;
    aCons.last().setCdr(new Cons(aTable, Cons.nil));
    aTable.set(InterpretedSymbol.of('butlast'), aCons);

    aString = '(lambda (l) (cond ((null (listp l)) nil) ((null l) 0) (t (+ 1 (length (cdr l))))))';
    aCons = Cons.parse(aString) as Cons;
    aCons.last().setCdr(new Cons(aTable, Cons.nil));
    aTable.set(InterpretedSymbol.of('length'), aCons);

    aString =
      '(lambda (n l) (cond ((> n (length l)) nil) ((= 0 n) l) (t (nthcdr (- n 1) (cdr l)))))';
    aCons = Cons.parse(aString) as Cons;
    aCons.last().setCdr(new Cons(aTable, Cons.nil));
    aTable.set(InterpretedSymbol.of('nthcdr'), aCons);

    aString =
      "(lambda (l) (cond ((null (listp l)) l) ((null l) '()) (t (append (reverse (cdr l)) (list (car l))))))";
    aCons = Cons.parse(aString) as Cons;
    aCons.last().setCdr(new Cons(aTable, Cons.nil));
    aTable.set(InterpretedSymbol.of('reverse'), aCons);

    aTable.set(InterpretedSymbol.of('t'), InterpretedSymbol.of('t'));

    return aTable;
  }
}
