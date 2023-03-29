(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.GMETransformations = {}));
})(this, (function (exports) { 'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	var dist = {};

	var option = {};

	var common = {};

	Object.defineProperty(common, "__esModule", { value: true });
	common.isTruthy = common.EmptyArray = common.FnVal = common.Val = common.T = void 0;
	/**
	 * Unique marker for `Option` and `Result` types.
	 *
	 * ### Warning
	 * This library sometimes assumes a value with this key is an Option or Result
	 * without explicitly checking the instance type or other properties.
	 */
	common.T = Symbol("T");
	common.Val = Symbol("Val");
	common.FnVal = Symbol("FnVal");
	common.EmptyArray = Object.freeze([]);
	function isTruthy(val) {
	    return val instanceof Date ? val.getTime() === val.getTime() : !!val;
	}
	common.isTruthy = isTruthy;

	var result = {};

	var hasRequiredResult;

	function requireResult () {
		if (hasRequiredResult) return result;
		hasRequiredResult = 1;
		Object.defineProperty(result, "__esModule", { value: true });
		result.Err = result.Ok = result.Result = result.ResultType = void 0;
		const common_1 = common;
		const option_1 = requireOption();
		class ResultType {
		    constructor(val, ok) {
		        this[common_1.Val] = val;
		        this[common_1.T] = ok;
		    }
		    [Symbol.iterator]() {
		        return this[common_1.T]
		            ? this[common_1.Val][Symbol.iterator]()
		            : common_1.EmptyArray[Symbol.iterator]();
		    }
		    into(err) {
		        return this[common_1.T] ? this[common_1.Val] : err;
		    }
		    /**
		     * Returns a tuple of `[null, T]` if the result is `Ok`, or `[E, null]`
		     * otherwise.
		     *
		     * ```
		     * const x: Result<number, string> = Ok(1);
		     * assert.deepEqual(x.intoTuple(), [null, 1]);
		     *
		     * const x: Result<number, string> = Err("error")
		     * assert.deepEqual(x.intoTuple(), ["error", null]);
		     * ```
		     */
		    intoTuple() {
		        return this[common_1.T] ? [null, this[common_1.Val]] : [this[common_1.Val], null];
		    }
		    /**
		     * Compares the Result to `cmp`, returns true if both are `Ok` or both
		     * are `Err` and acts as a type guard.
		     *
		     * ```
		     * const o = Ok(1);
		     * const e = Err(1);
		     *
		     * assert.equal(o.isLike(Ok(1))), true);
		     * assert.equal(e.isLike(Err(1)), true);
		     * assert.equal(o.isLike(e), false);
		     * ```
		     */
		    isLike(cmp) {
		        return cmp instanceof ResultType && this[common_1.T] === cmp[common_1.T];
		    }
		    /**
		     * Returns true if the Result is `Ok` and acts as a type guard.
		     *
		     * ```
		     * const x = Ok(10);
		     * assert.equal(x.isOk(), true);
		     *
		     * const x = Err(10);
		     * assert.equal(x.isOk(), false);
		     * ```
		     */
		    isOk() {
		        return this[common_1.T];
		    }
		    /**
		     * Returns true if the Result is `Err` and acts as a type guard.
		     *
		     * ```
		     * const x = Ok(10);
		     * assert.equal(x.isErr(), false);
		     *
		     * const x = Err(10);
		     * assert.equal(x.isErr(), true);
		     * ```
		     */
		    isErr() {
		        return !this[common_1.T];
		    }
		    /**
		     * Creates an `Option<T>` by calling `f` with the contained `Ok` value.
		     * Converts `Ok` to `Some` if the filter returns true, or `None` otherwise.
		     *
		     * For more advanced filtering, consider `match`.
		     *
		     * ```
		     * const x = Ok(1);
		     * assert.equal(x.filter((v) => v < 5).isLike(Some(1)), true);
		     * assert.equal(x.filter((v) => v < 5).unwrap(), 1);
		     *
		     * const x = Ok(10);
		     * assert.equal(x.filter((v) => v < 5).isNone(), true);
		     *
		     * const x = Err(1);
		     * assert.equal(x.filter((v) => v < 5).isNone(), true);
		     * ```
		     */
		    filter(f) {
		        return this[common_1.T] && f(this[common_1.Val]) ? (0, option_1.Some)(this[common_1.Val]) : option_1.None;
		    }
		    /**
		     * Flatten a nested `Result<Result<T, E>, F>` to a `Result<T, E | F>`.
		     *
		     * ```
		     * type NestedResult = Result<Result<string, number>, boolean>;
		     *
		     * const x: NestedResult = Ok(Ok(1));
		     * assert.equal(x.flatten().unwrap(), 1);
		     *
		     * const x: NestedResult = Ok(Err(1));
		     * assert.equal(x.flatten().unwrapErr(), 1);
		     *
		     * const x: NestedResult = Err(false);
		     * assert.equal(x.flatten().unwrapErr(), false);
		     * ```
		     */
		    flatten() {
		        return this[common_1.T] ? this[common_1.Val] : this;
		    }
		    /**
		     * Returns the contained `Ok` value and throws `Error(msg)` if `Err`.
		     *
		     * To avoid throwing, consider `isOk`, `unwrapOr`, `unwrapOrElse` or
		     * `match` to handle the `Err` case.
		     *
		     * ```
		     * const x = Ok(1);
		     * assert.equal(x.expect("Was Err"), 1);
		     *
		     * const x = Err(1);
		     * const y = x.expect("Was Err"); // throws
		     * ```
		     */
		    expect(msg) {
		        if (this[common_1.T]) {
		            return this[common_1.Val];
		        }
		        else {
		            throw new Error(msg);
		        }
		    }
		    /**
		     * Returns the contained `Err` value and throws `Error(msg)` if `Ok`.
		     *
		     * To avoid throwing, consider `isErr` or `match` to handle the `Ok` case.
		     *
		     * ```
		     * const x = Ok(1);
		     * const y = x.expectErr("Was Ok"); // throws
		     *
		     * const x = Err(1);
		     * assert.equal(x.expectErr("Was Ok"), 1);
		     * ```
		     */
		    expectErr(msg) {
		        if (this[common_1.T]) {
		            throw new Error(msg);
		        }
		        else {
		            return this[common_1.Val];
		        }
		    }
		    /**
		     * Returns the contained `Ok` value and throws if `Err`.
		     *
		     * To avoid throwing, consider `isOk`, `unwrapOr`, `unwrapOrElse` or
		     * `match` to handle the `Err` case. To throw a more informative error use
		     * `expect`.
		     *
		     * ```
		     * const x = Ok(1);
		     * assert.equal(x.unwrap(), 1);
		     *
		     * const x = Err(1);
		     * const y = x.unwrap(); // throws
		     * ```
		     */
		    unwrap() {
		        return this.expect("Failed to unwrap Result (found Err)");
		    }
		    /**
		     * Returns the contained `Err` value and throws if `Ok`.
		     *
		     * To avoid throwing, consider `isErr` or `match` to handle the `Ok` case.
		     * To throw a more informative error use `expectErr`.
		     *
		     * ```
		     * const x = Ok(1);
		     * const y = x.unwrap(); // throws
		     *
		     * const x = Err(1);
		     * assert.equal(x.unwrap(), 1);
		     * ```
		     */
		    unwrapErr() {
		        return this.expectErr("Failed to unwrapErr Result (found Ok)");
		    }
		    /**
		     * Returns the contained `Ok` value or a provided default.
		     *
		     * The provided default is eagerly evaluated. If you are passing the result
		     * of a function call, consider `unwrapOrElse`, which is lazily evaluated.
		     *
		     * ```
		     * const x = Ok(10);
		     * assert.equal(x.unwrapOr(1), 10);
		     *
		     * const x = Err(10);
		     * assert.equal(x.unwrapOr(1), 1);
		     * ```
		     */
		    unwrapOr(def) {
		        return this[common_1.T] ? this[common_1.Val] : def;
		    }
		    /**
		     * Returns the contained `Ok` value or computes it from a function.
		     *
		     * ```
		     * const x = Ok(10);
		     * assert.equal(x.unwrapOrElse(() => 1 + 1), 10);
		     *
		     * const x = Err(10);
		     * assert.equal(x.unwrapOrElse(() => 1 + 1), 2);
		     * ```
		     */
		    unwrapOrElse(f) {
		        return this[common_1.T] ? this[common_1.Val] : f();
		    }
		    /**
		     * Returns the contained `Ok` or `Err` value.
		     *
		     * Most problems are better solved using one of the other `unwrap_` methods.
		     * This method should only be used when you are certain that you need it.
		     *
		     * ```
		     * const x = Ok(10);
		     * assert.equal(x.unwrapUnchecked(), 10);
		     *
		     * const x = Err(20);
		     * assert.equal(x.unwrapUnchecked(), 20);
		     * ```
		     */
		    unwrapUnchecked() {
		        return this[common_1.Val];
		    }
		    /**
		     * Returns the Option if it is `Ok`, otherwise returns `resb`.
		     *
		     * `resb` is eagerly evaluated. If you are passing the result of a function
		     * call, consider `orElse`, which is lazily evaluated.
		     *
		     * ```
		     * const x = Ok(10);
		     * const xor = x.or(Ok(1));
		     * assert.equal(xor.unwrap(), 10);
		     *
		     * const x = Err(10);
		     * const xor = x.or(Ok(1));
		     * assert.equal(xor.unwrap(), 1);
		     * ```
		     */
		    or(resb) {
		        return this[common_1.T] ? this : resb;
		    }
		    /**
		     * Returns the Result if it is `Ok`, otherwise returns the value of `f()`
		     * mapping `Result<T, E>` to `Result<T, F>`.
		     *
		     * ```
		     * const x = Ok(10);
		     * const xor = x.orElse(() => Ok(1));
		     * assert.equal(xor.unwrap(), 10);
		     *
		     * const x = Err(10);
		     * const xor = x.orElse(() => Ok(1));
		     * assert.equal(xor.unwrap(), 1);
		     *
		     * const x = Err(10);
		     * const xor = x.orElse((e) => Err(`val ${e}`));
		     * assert.equal(xor.unwrapErr(), "val 10");
		     * ```
		     */
		    orElse(f) {
		        return this[common_1.T] ? this : f(this[common_1.Val]);
		    }
		    /**
		     * Returns itself if the Result is `Err`, otherwise returns `resb`.
		     *
		     * ```
		     * const x = Ok(10);
		     * const xand = x.and(Ok(1));
		     * assert.equal(xand.unwrap(), 1);
		     *
		     * const x = Err(10);
		     * const xand = x.and(Ok(1));
		     * assert.equal(xand.unwrapErr(), 10);
		     *
		     * const x = Ok(10);
		     * const xand = x.and(Err(1));
		     * assert.equal(xand.unwrapErr(), 1);
		     * ```
		     */
		    and(resb) {
		        return this[common_1.T] ? resb : this;
		    }
		    /**
		     * Returns itself if the Result is `Err`, otherwise calls `f` with the `Ok`
		     * value and returns the result.
		     *
		     * ```
		     * const x = Ok(10);
		     * const xand = x.andThen((n) => n + 1);
		     * assert.equal(xand.unwrap(), 11);
		     *
		     * const x = Err(10);
		     * const xand = x.andThen((n) => n + 1);
		     * assert.equal(xand.unwrapErr(), 10);
		     *
		     * const x = Ok(10);
		     * const xand = x.and(Err(1));
		     * assert.equal(xand.unwrapErr(), 1);
		     * ```
		     */
		    andThen(f) {
		        return this[common_1.T] ? f(this[common_1.Val]) : this;
		    }
		    /**
		     * Maps a `Result<T, E>` to `Result<U, E>` by applying a function to the
		     * `Ok` value.
		     *
		     * ```
		     * const x = Ok(10);
		     * const xmap = x.map((n) => `number ${n}`);
		     * assert.equal(xmap.unwrap(), "number 10");
		     * ```
		     */
		    map(f) {
		        return new ResultType(this[common_1.T] ? f(this[common_1.Val]) : this[common_1.Val], this[common_1.T]);
		    }
		    /**
		     * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to the
		     * `Err` value.
		     *
		     * ```
		     * const x = Err(10);
		     * const xmap = x.mapErr((n) => `number ${n}`);
		     * assert.equal(xmap.unwrapErr(), "number 10");
		     * ```
		     */
		    mapErr(op) {
		        return new ResultType(this[common_1.T] ? this[common_1.Val] : op(this[common_1.Val]), this[common_1.T]);
		    }
		    /**
		     * Returns the provided default if `Err`, otherwise calls `f` with the
		     * `Ok` value and returns the result.
		     *
		     * The provided default is eagerly evaluated. If you are passing the result
		     * of a function call, consider `mapOrElse`, which is lazily evaluated.
		     *
		     * ```
		     * const x = Ok(10);
		     * const xmap = x.mapOr(1, (n) => n + 1);
		     * assert.equal(xmap.unwrap(), 11);
		     *
		     * const x = Err(10);
		     * const xmap = x.mapOr(1, (n) => n + 1);
		     * assert.equal(xmap.unwrap(), 1);
		     * ```
		     */
		    mapOr(def, f) {
		        return this[common_1.T] ? f(this[common_1.Val]) : def;
		    }
		    /**
		     * Computes a default return value if `Err`, otherwise calls `f` with the
		     * `Ok` value and returns the result.
		     *
		     * ```
		     * const x = Ok(10);
		     * const xmap = x.mapOrElse(() => 1 + 1, (n) => n + 1);
		     * assert.equal(xmap.unwrap(), 11);
		     *
		     * const x = Err(10);
		     * const xmap = x.mapOrElse(() => 1 + 1, (n) => n + 1);
		     * assert.equal(xmap.unwrap(), 2);
		     * ```
		     */
		    mapOrElse(def, f) {
		        return this[common_1.T] ? f(this[common_1.Val]) : def(this[common_1.Val]);
		    }
		    /**
		     * Transforms the `Result<T, E>` into an `Option<T>`, mapping `Ok(v)` to
		     * `Some(v)`, discarding any `Err` value and mapping to None.
		     *
		     * ```
		     * const x = Ok(10);
		     * const opt = x.ok();
		     * assert.equal(x.isSome(), true);
		     * assert.equal(x.unwrap(), 10);
		     *
		     * const x = Err(10);
		     * const opt = x.ok();
		     * assert.equal(x.isNone(), true);
		     * const y = x.unwrap(); // throws
		     * ```
		     */
		    ok() {
		        return this[common_1.T] ? (0, option_1.Some)(this[common_1.Val]) : option_1.None;
		    }
		}
		result.ResultType = ResultType;
		/**
		 * Tests the provided `val` is an Result and acts as a type guard.
		 *
		 * ```
		 * assert.equal(Result.is(Ok(1), true);
		 * assert.equal(Result.is(Err(1), true));
		 * assert.equal(Result.is(Some(1), false));
		 * ```
		 */
		function is(val) {
		    return val instanceof ResultType;
		}
		/**
		 * A Result represents success, or failure. If we hold a value
		 * of type `Result<T, E>`, we know it is either `Ok<T>` or `Err<E>`.
		 *
		 * As a function, `Result` is an alias for `Result.from`.
		 *
		 * ```
		 * const users = ["Fry", "Bender"];
		 * function fetch_user(username: string): Result<string, string> {
		 *    return users.includes(username) ? Ok(username) : Err("Wha?");
		 * }
		 *
		 * function greet(username: string): string {
		 *    return fetch_user(username).mapOrElse(
		 *       (err) => `Error: ${err}`,
		 *       (user) => `Good news everyone, ${user} is here!`
		 *    );
		 * }
		 *
		 * assert.equal(greet("Bender"), "Good news everyone, Bender is here!");
		 * assert.equal(greet("SuperKing"), "Error: Wha?");
		 * ```
		 */
		function Result(val) {
		    return from(val);
		}
		result.Result = Result;
		Result.is = is;
		Result.from = from;
		Result.nonNull = nonNull;
		Result.qty = qty;
		Result.safe = safe;
		Result.all = all;
		Result.any = any;
		/**
		 * Creates an `Ok<T>` value, which can be used where a `Result<T, E>` is
		 * required. See Result for more examples.
		 *
		 * Note that the counterpart `Err` type `E` is set to the same type as `T`
		 * by default. TypeScript will usually infer the correct `E` type from the
		 * context (e.g. a function which accepts or returns a Result).
		 *
		 * ```
		 * const x = Ok(10);
		 * assert.equal(x.isSome(), true);
		 * assert.equal(x.unwrap(), 10);
		 * ```
		 */
		function Ok(val) {
		    return new ResultType(val, true);
		}
		result.Ok = Ok;
		/**
		 * Creates an `Err<E>` value, which can be used where a `Result<T, E>` is
		 * required. See Result for more examples.
		 *
		 * Note that the counterpart `Ok` type `T` is set to the same type as `E`
		 * by default. TypeScript will usually infer the correct `T` type from the
		 * context (e.g. a function which accepts or returns a Result).
		 *
		 * ```
		 * const x = Err(10);
		 * assert.equal(x.isErr(), true);
		 * assert.equal(x.unwrapErr(), 10);
		 * ```
		 */
		function Err(val) {
		    return new ResultType(val, false);
		}
		result.Err = Err;
		/**
		 * Creates a new `Result<T, E>` which is `Ok<T>` unless the provided `val` is
		 * falsey, an instance of `Error` or an invalid `Date`.
		 *
		 * The `T` is narrowed to exclude any falsey values or Errors.
		 *
		 * The `E` type includes:
		 * - `null` (if `val` could have been falsey or an invalid date)
		 * - `Error` types excluded from `T` (if there are any)
		 *
		 * **Note:** `null` is not a useful value. Consider `Option.from` or `mapErr`.
		 *
		 * ```
		 * assert.equal(Result.from(1).unwrap(), 1);
		 * assert.equal(Result(0).isErr(), true);
		 *
		 * const err = Result.from(new Error("msg"));
		 * assert.equal(err.unwrapErr().message, "msg");
		 *
		 * // Create a Result<number, string>
		 * const x = Option.from(1).okOr("Falsey Value");
		 * ```
		 */
		function from(val) {
		    return (0, common_1.isTruthy)(val)
		        ? new ResultType(val, !(val instanceof Error))
		        : Err(null);
		}
		/**
		 * Creates a new `Result<T, null>` which is `Ok` unless the provided `val` is
		 * `undefined`, `null` or `NaN`.
		 *
		 * **Note:** `null` is not a useful value. Consider `Option.nonNull` or
		 * `mapErr`.
		 *
		 * ```
		 * assert.equal(Result.nonNull(1).unwrap(), 1);
		 * assert.equal(Result.nonNull(0).unwrap(), 0);
		 * assert.equal(Result.nonNull(null).isErr(), true);
		 *
		 * // Create a Result<number, string>
		 * const x = Option.nonNull(1).okOr("Nullish Value");
		 * ```
		 */
		function nonNull(val) {
		    return val === undefined || val === null || val !== val
		        ? Err(null)
		        : Ok(val);
		}
		/**
		 * Creates a new Result<number, null> which is `Ok` when the provided `val` is
		 * a finite integer greater than or equal to 0.
		 *
		 * **Note:** `null` is not a useful value. Consider `Option.qty` or `mapErr`.
		 *
		 * ```
		 * const x = Result.qty("test".indexOf("s"));
		 * assert.equal(x.unwrap(), 2);
		 *
		 * const x = Result.qty("test".indexOf("z"));
		 * assert.equal(x.unwrapErr(), null);
		 *
		 * // Create a Result<number, string>
		 * const x = Result.qty("test".indexOf("s")).mapErr(() => "Not Found");
		 * ```
		 */
		function qty(val) {
		    return val >= 0 && Number.isInteger(val) ? Ok(val) : Err(null);
		}
		function safe(fn, ...args) {
		    if (fn instanceof Promise) {
		        return fn.then((val) => Ok(val), toError);
		    }
		    try {
		        return Ok(fn(...args));
		    }
		    catch (err) {
		        return toError(err);
		    }
		}
		function toError(err) {
		    return err instanceof Error ? Err(err) : Err(new Error(String(err)));
		}
		/**
		 * Converts a number of `Result`s into a single Result. The first `Err` found
		 * (if any) is returned, otherwise the new Result is `Ok` and contains an array
		 * of all the unwrapped values.
		 *
		 * ```
		 * function num(val: number): Result<number, string> {
		 *    return val > 10 ? Ok(val) : Err(`Value ${val} is too low.`);
		 * }
		 *
		 * const xyz = Result.all(num(20), num(30), num(40));
		 * const [x, y, z] = xyz.unwrap();
		 * assert.equal(x, 20);
		 * assert.equal(y, 30);
		 * assert.equal(z, 40);
		 *
		 * const err = Result.all(num(20), num(5), num(40));
		 * assert.equal(err.isErr(), true);
		 * assert.equal(err.unwrapErr(), "Value 5 is too low.");
		 * ```
		 */
		function all(...results) {
		    const ok = [];
		    for (const result of results) {
		        if (result.isOk()) {
		            ok.push(result.unwrapUnchecked());
		        }
		        else {
		            return result;
		        }
		    }
		    return Ok(ok);
		}
		/**
		 * Converts a number of `Result`s into a single Result. The first `Ok` found
		 * (if any) is returned, otherwise the new Result is an `Err` containing an
		 * array of all the unwrapped errors.
		 *
		 * ```
		 * function num(val: number): Result<number, string> {
		 *    return val > 10 ? Ok(val) : Err(`Value ${val} is too low.`);
		 * }
		 *
		 * const x = Result.any(num(5), num(20), num(2));
		 * assert.equal(x.unwrap(), 20);
		 *
		 * const efg = Result.any(num(2), num(5), num(8));
		 * const [e, f, g] = efg.unwrapErr();
		 * assert.equal(e, "Value 2 is too low.");
		 * assert.equal(f, "Value 5 is too low.");
		 * assert.equal(g, "Value 8 is too low.");
		 * ```
		 */
		function any(...results) {
		    const err = [];
		    for (const result of results) {
		        if (result.isOk()) {
		            return result;
		        }
		        else {
		            err.push(result.unwrapUnchecked());
		        }
		    }
		    return Err(err);
		}
		return result;
	}

	var hasRequiredOption;

	function requireOption () {
		if (hasRequiredOption) return option;
		hasRequiredOption = 1;
		(function (exports) {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.None = exports.Some = exports.Option = void 0;
			const common_1 = common;
			const result_1 = requireResult();
			class OptionType {
			    constructor(val, some) {
			        this[common_1.T] = some;
			        this[common_1.Val] = val;
			    }
			    [Symbol.iterator]() {
			        return this[common_1.T]
			            ? this[common_1.Val][Symbol.iterator]()
			            : common_1.EmptyArray[Symbol.iterator]();
			    }
			    into(none) {
			        return this[common_1.T] ? this[common_1.Val] : none;
			    }
			    /**
			     * Compares the Option to `cmp`, returns true if both are `Some` or both
			     * are `None` and acts as a type guard.
			     *
			     * ```
			     * const s: Option<number> = Some(1);
			     * const n: Option<number> = None;
			     *
			     * assert.equal(s.isLike(Some(10)), true);
			     * assert.equal(n.isLike(None), true);
			     * assert.equal(s.isLike(n), false);
			     * ```
			     */
			    isLike(cmp) {
			        return cmp instanceof OptionType && this[common_1.T] === cmp[common_1.T];
			    }
			    /**
			     * Returns true if the Option is `Some` and acts as a type guard.
			     *
			     * ```
			     * const x = Some(10);
			     * assert.equal(x.Is(), true);
			     *
			     * const x: Option<number> = None;
			     * assert.equal(x.Is(), false);
			     * ```
			     */
			    isSome() {
			        return this[common_1.T];
			    }
			    /**
			     * Returns true if the Option is `None` and acts as a type guard.
			     *
			     * ```
			     * const x = Some(10);
			     * assert.equal(x.isNone(), false);
			     *
			     * const x: Option<number> = None;
			     * assert.equal(x.isNone(), true);
			     * ```
			     */
			    isNone() {
			        return !this[common_1.T];
			    }
			    /**
			     * Calls `f` with the contained `Some` value, converting `Some` to `None` if
			     * the filter returns false.
			     *
			     * For more advanced filtering, consider `match`.
			     *
			     * ```
			     * const x = Some(1);
			     * assert.equal(x.filter((v) => v < 5).unwrap(), 1);
			     *
			     * const x = Some(10);
			     * assert.equal(x.filter((v) => v < 5).isNone(), true);
			     *
			     * const x: Option<number> = None;
			     * assert.equal(x.filter((v) => v < 5).isNone(), true);
			     * ```
			     */
			    filter(f) {
			        return this[common_1.T] && f(this[common_1.Val]) ? this : exports.None;
			    }
			    /**
			     * Flatten a nested `Option<Option<T>>` to an `Option<T>`.
			     *
			     * ```
			     * type NestedOption = Option<Option<number>>;
			     *
			     * const x: NestedOption = Some(Some(1));
			     * assert.equal(x.flatten().unwrap(), 1);
			     *
			     * const x: NestedOption = Some(None);
			     * assert.equal(x.flatten().isNone(), true);
			     *
			     * const x: NestedOption = None;
			     * assert.equal(x.flatten().isNone(), true);
			     * ```
			     */
			    flatten() {
			        return this[common_1.T] ? this[common_1.Val] : exports.None;
			    }
			    /**
			     * Returns the contained `Some` value and throws `Error(msg)` if `None`.
			     *
			     * To avoid throwing, consider `Is`, `unwrapOr`, `unwrapOrElse` or
			     * `match` to handle the `None` case.
			     *
			     * ```
			     * const x = Some(1);
			     * assert.equal(x.expect("Is empty"), 1);
			     *
			     * const x: Option<number> = None;
			     * const y = x.expect("Is empty"); // throws
			     * ```
			     */
			    expect(msg) {
			        if (this[common_1.T]) {
			            return this[common_1.Val];
			        }
			        else {
			            throw new Error(msg);
			        }
			    }
			    /**
			     * Returns the contained `Some` value and throws if `None`.
			     *
			     * To avoid throwing, consider `isSome`, `unwrapOr`, `unwrapOrElse` or
			     * `match` to handle the `None` case. To throw a more informative error use
			     * `expect`.
			     *
			     * ```
			     * const x = Some(1);
			     * assert.equal(x.unwrap(), 1);
			     *
			     * const x: Option<number> = None;
			     * const y = x.unwrap(); // throws
			     * ```
			     */
			    unwrap() {
			        return this.expect("Failed to unwrap Option (found None)");
			    }
			    /**
			     * Returns the contained `Some` value or a provided default.
			     *
			     * The provided default is eagerly evaluated. If you are passing the result
			     * of a function call, consider `unwrapOrElse`, which is lazily evaluated.
			     *
			     * ```
			     * const x = Some(10);
			     * assert.equal(x.unwrapOr(1), 10);
			     *
			     * const x: Option<number> = None;
			     * assert.equal(x.unwrapOr(1), 1);
			     * ```
			     */
			    unwrapOr(def) {
			        return this[common_1.T] ? this[common_1.Val] : def;
			    }
			    /**
			     * Returns the contained `Some` value or computes it from a function.
			     *
			     * ```
			     * const x = Some(10);
			     * assert.equal(x.unwrapOrElse(() => 1 + 1), 10);
			     *
			     * const x: Option<number> = None;
			     * assert.equal(x.unwrapOrElse(() => 1 + 1), 2);
			     * ```
			     */
			    unwrapOrElse(f) {
			        return this[common_1.T] ? this[common_1.Val] : f();
			    }
			    /**
			     * Returns the contained `Some` value or undefined if `None`.
			     *
			     * Most problems are better solved using one of the other `unwrap_` methods.
			     * This method should only be used when you are certain that you need it.
			     *
			     * ```
			     * const x = Some(10);
			     * assert.equal(x.unwrapUnchecked(), 10);
			     *
			     * const x: Option<number> = None;
			     * assert.equal(x.unwrapUnchecked(), undefined);
			     * ```
			     */
			    unwrapUnchecked() {
			        return this[common_1.Val];
			    }
			    /**
			     * Returns the Option if it is `Some`, otherwise returns `optb`.
			     *
			     * `optb` is eagerly evaluated. If you are passing the result of a function
			     * call, consider `orElse`, which is lazily evaluated.
			     *
			     * ```
			     * const x = Some(10);
			     * const xor = x.or(Some(1));
			     * assert.equal(xor.unwrap(), 10);
			     *
			     * const x: Option<number> = None;
			     * const xor = x.or(Some(1));
			     * assert.equal(xor.unwrap(), 1);
			     * ```
			     */
			    or(optb) {
			        return this[common_1.T] ? this : optb;
			    }
			    /**
			     * Returns the Option if it is `Some`, otherwise returns the value of `f()`.
			     *
			     * ```
			     * const x = Some(10);
			     * const xor = x.orElse(() => Some(1));
			     * assert.equal(xor.unwrap(), 10);
			     *
			     * const x: Option<number> = None;
			     * const xor = x.orElse(() => Some(1));
			     * assert.equal(xor.unwrap(), 1);
			     * ```
			     */
			    orElse(f) {
			        return this[common_1.T] ? this : f();
			    }
			    /**
			     * Returns `None` if the Option is `None`, otherwise returns `optb`.
			     *
			     * ```
			     * const x = Some(10);
			     * const xand = x.and(Some(1));
			     * assert.equal(xand.unwrap(), 1);
			     *
			     * const x: Option<number> = None;
			     * const xand = x.and(Some(1));
			     * assert.equal(xand.isNone(), true);
			     *
			     * const x = Some(10);
			     * const xand = x.and(None);
			     * assert.equal(xand.isNone(), true);
			     * ```
			     */
			    and(optb) {
			        return this[common_1.T] ? optb : exports.None;
			    }
			    /**
			     * Returns `None` if the option is `None`, otherwise calls `f` with the
			     * `Some` value and returns the result.
			     *
			     * ```
			     * const x = Some(10);
			     * const xand = x.andThen((n) => n + 1);
			     * assert.equal(xand.unwrap(), 11);
			     *
			     * const x: Option<number> = None;
			     * const xand = x.andThen((n) => n + 1);
			     * assert.equal(xand.isNone(), true);
			     *
			     * const x = Some(10);
			     * const xand = x.andThen(() => None);
			     * assert.equal(xand.isNone(), true);
			     * ```
			     */
			    andThen(f) {
			        return this[common_1.T] ? f(this[common_1.Val]) : exports.None;
			    }
			    /**
			     * Maps an `Option<T>` to `Option<U>` by applying a function to the `Some`
			     * value.
			     *
			     * ```
			     * const x = Some(10);
			     * const xmap = x.map((n) => `number ${n}`);
			     * assert.equal(xmap.unwrap(), "number 10");
			     * ```
			     */
			    map(f) {
			        return this[common_1.T] ? new OptionType(f(this[common_1.Val]), true) : exports.None;
			    }
			    /**
			     * Returns the provided default if `None`, otherwise calls `f` with the
			     * `Some` value and returns the result.
			     *
			     * The provided default is eagerly evaluated. If you are passing the result
			     * of a function call, consider `mapOrElse`, which is lazily evaluated.
			     *
			     * ```
			     * const x = Some(10);
			     * const xmap = x.mapOr(1, (n) => n + 1);
			     * assert.equal(xmap.unwrap(), 11);
			     *
			     * const x: Option<number> = None;
			     * const xmap = x.mapOr(1, (n) => n + 1);
			     * assert.equal(xmap.unwrap(), 1);
			     * ```
			     */
			    mapOr(def, f) {
			        return this[common_1.T] ? f(this[common_1.Val]) : def;
			    }
			    /**
			     * Computes a default return value if `None`, otherwise calls `f` with the
			     * `Some` value and returns the result.
			     *
			     * const x = Some(10);
			     * const xmap = x.mapOrElse(() => 1 + 1, (n) => n + 1);
			     * assert.equal(xmap.unwrap(), 11);
			     *
			     * const x: Option<number> = None;
			     * const xmap = x.mapOrElse(() => 1 + 1, (n) => n + 1);
			     * assert.equal(xmap.unwrap(), 2);
			     * ```
			     */
			    mapOrElse(def, f) {
			        return this[common_1.T] ? f(this[common_1.Val]) : def();
			    }
			    /**
			     * Transforms the `Option<T>` into a `Result<T, E>`, mapping `Some(v)` to
			     * `Ok(v)` and `None` to `Err(err)`.
			     *
			     * ```
			     * const x = Some(10);
			     * const res = x.okOr("Is empty");
			     * assert.equal(x.isOk(), true);
			     * assert.equal(x.unwrap(), 10);
			     *
			     * const x: Option<number> = None;
			     * const res = x.okOr("Is empty");
			     * assert.equal(x.isErr(), true);
			     * assert.equal(x.unwrap_err(), "Is empty");
			     * ```
			     */
			    okOr(err) {
			        return this[common_1.T] ? (0, result_1.Ok)(this[common_1.Val]) : (0, result_1.Err)(err);
			    }
			    /**
			     * Transforms the `Option<T>` into a `Result<T, E>`, mapping `Some(v)` to
			     * `Ok(v)` and `None` to `Err(f())`.
			     *
			     * ```
			     * const x = Some(10);
			     * const res = x.okOrElse(() => ["Is", "empty"].join(" "));
			     * assert.equal(x.isOk(), true);
			     * assert.equal(x.unwrap(), 10);
			     *
			     * const x: Option<number> = None;
			     * const res = x.okOrElse(() => ["Is", "empty"].join(" "));
			     * assert.equal(x.isErr(), true);
			     * assert.equal(x.unwrap_err(), "Is empty");
			     * ```
			     */
			    okOrElse(f) {
			        return this[common_1.T] ? (0, result_1.Ok)(this[common_1.Val]) : (0, result_1.Err)(f());
			    }
			}
			/**
			 * An Option represents either something, or nothing. If we hold a value
			 * of type `Option<T>`, we know it is either `Some<T>` or `None`.
			 *
			 * As a function, `Option` is an alias for `Option.from`.
			 *
			 * ```
			 * const users = ["Fry", "Bender"];
			 * function fetch_user(username: string): Option<string> {
			 *    return users.includes(username) ? Some(username) : None;
			 * }
			 *
			 * function greet(username: string): string {
			 *    return fetch_user(username)
			 *       .map((user) => `Good news everyone, ${user} is here!`)
			 *       .unwrapOr("Wha?");
			 * }
			 *
			 * assert.equal(greet("Bender"), "Good news everyone, Bender is here!");
			 * assert.equal(greet("SuperKing"), "Wha?");
			 * ```
			 */
			function Option(val) {
			    return from(val);
			}
			exports.Option = Option;
			Option.is = is;
			Option.from = from;
			Option.nonNull = nonNull;
			Option.qty = qty;
			Option.safe = safe;
			Option.all = all;
			Option.any = any;
			/**
			 * Creates a `Some<T>` value, which can be used where an `Option<T>` is
			 * required. See Option for more examples.
			 *
			 * ```
			 * const x = Some(10);
			 * assert.equal(x.isSome(), true);
			 * assert.equal(x.unwrap(), 10);
			 * ```
			 */
			function Some(val) {
			    return new OptionType(val, true);
			}
			exports.Some = Some;
			/**
			 * The `None` value, which can be used where an `Option<T>` is required.
			 * See Option for more examples.
			 *
			 * ```
			 * const x = None;
			 * assert.equal(x.isNone(), true);
			 * const y = x.unwrap(); // throws
			 * ```
			 */
			exports.None = Object.freeze(new OptionType(undefined, false));
			/**
			 * Tests whether the provided `val` is an Option, and acts as a type guard.
			 *
			 * ```
			 * assert.equal(Option.is(Some(1), true);
			 * assert.equal(Option.is(None, true));
			 * assert.equal(Option.is(Ok(1), false));
			 * ```
			 */
			function is(val) {
			    return val instanceof OptionType;
			}
			/**
			 * Creates a new `Option<T>` which is `Some` unless the provided `val` is
			 * falsey, an instance of `Error` or an invalid `Date`. This function is
			 * aliased by `Option`.
			 *
			 * The `T` type is narrowed to exclude falsey orError values.
			 *
			 * ```
			 * assert.equal(Option.from(1).unwrap(), 1);
			 * assert.equal(from(0).isNone(), true);
			 *
			 * const err = Option.from(new Error("msg"));
			 * assert.equal(err.isNone(), true);
			 * ```
			 */
			function from(val) {
			    return (0, common_1.isTruthy)(val) && !(val instanceof Error) ? Some(val) : exports.None;
			}
			/**
			 * Creates a new `Option<T>` which is `Some` unless the provided `val` is
			 * `undefined`, `null` or `NaN`.
			 *
			 * ```
			 * assert.equal(Option.nonNull(1).unwrap(), 1);
			 * assert.equal(Option.nonNull(0).unwrap(), 0);
			 * assert.equal(Option.nonNull(null).isNone(), true);
			 * ```
			 */
			function nonNull(val) {
			    return val === undefined || val === null || val !== val
			        ? exports.None
			        : Some(val);
			}
			/**
			 * Creates a new Option<number> which is `Some` when the provided `val` is a
			 * finite integer greater than or equal to 0.
			 *
			 * ```
			 * const x = Option.qty("test".indexOf("s"));
			 * assert.equal(x.unwrap(), 2);
			 *
			 * const x = Option.qty("test".indexOf("z"));
			 * assert.equal(x.isNone(), true);
			 * ```
			 */
			function qty(val) {
			    return val >= 0 && Number.isInteger(val) ? Some(val) : exports.None;
			}
			function safe(fn, ...args) {
			    if (fn instanceof Promise) {
			        return fn.then((val) => Some(val), () => exports.None);
			    }
			    try {
			        return Some(fn(...args));
			    }
			    catch {
			        return exports.None;
			    }
			}
			/**
			 * Converts a number of `Option`s into a single Option. If any of the provided
			 * Options are `None` then the new Option is also None. Otherwise the new
			 * Option is `Some` and contains an array of all the unwrapped values.
			 *
			 * ```
			 * function num(val: number): Option<number> {
			 *    return val > 10 ? Some(val) : None;
			 * }
			 *
			 * const xyz = Option.all(num(20), num(30), num(40));
			 * const [x, y, z] = xyz.unwrap();
			 * assert.equal(x, 20);
			 * assert.equal(y, 30);
			 * assert.equal(z, 40);
			 *
			 * const x = Option.all(num(20), num(5), num(40));
			 * assert.equal(x.isNone(), true);
			 * ```
			 */
			function all(...options) {
			    const some = [];
			    for (const option of options) {
			        if (option.isSome()) {
			            some.push(option.unwrapUnchecked());
			        }
			        else {
			            return exports.None;
			        }
			    }
			    return Some(some);
			}
			/**
			 * Converts a number of `Options`s into a single Option. The first `Some` found
			 * (if any) is returned, otherwise the new Option is `None`.
			 *
			 * ```
			 * function num(val: number): Option<number> {
			 *    return val > 10 ? Some(val) : None;
			 * }
			 *
			 * const x = Option.any(num(5), num(20), num(2));
			 * assert.equal(x.unwrap(), 20);
			 *
			 * const x = Option.any(num(2), num(5), num(8));
			 * assert.equal(x.isNone(), true);
			 * ```
			 */
			function any(...options) {
			    for (const option of options) {
			        if (option.isSome()) {
			            return option;
			        }
			    }
			    return exports.None;
			}
	} (option));
		return option;
	}

	var match = {};

	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.Fn = exports._ = exports.Default = exports.match = void 0;
		const common_1 = common;
		const option_1 = requireOption();
		const result_1 = requireResult();
		/**
		 * Concisely determine what action should be taken for a given input value.
		 *
		 * ### Mapped Matching
		 *
		 * Mapped matching is possible on `Option` and `Result` types. Passing any
		 * other type will throw an invalid pattern error.
		 *
		 * ```
		 * const num = Option(10);
		 * const res = match(num, {
		 *    Some: (n) => n + 1,
		 *    None: () => 0,
		 * });
		 *
		 * assert.equal(res, 11);
		 * ```
		 *
		 * You can nest mapped matching patterns and provide defaults. If a default is
		 * not found in the current level it will fall back to the previous level. When
		 * no suitable match or default is found, an exhausted error is thrown.
		 *
		 * ```
		 * function nested(val: Result<Option<number>, string>): string {
		 *    return match(val, {
		 *       Ok: { Some: (num) => `found ${num}` },
		 *       _: () => "nothing",
		 *    });
		 * }
		 *
		 * assert.equal(nested(Ok(Some(10))), "found 10");
		 * assert.equal(nested(Ok(None)), "nothing");
		 * assert.equal(nested(Err("Not a number")), "nothing");
		 * ```
		 *
		 * ### Combined Matching
		 *
		 * Mapped Matching and Chained Matching can be combined. A match chain can be
		 * provided instead of a function for `Some`, `Ok` and `Err`. E.g.
		 *
		 * ```
		 * function matchNum(val: Option<number>): string {
		 *    return match(val, {
		 *       Some: [
		 *          [5, "5"],
		 *          [(x) => x < 10, "< 10"],
		 *          [(x) => x > 20, "> 20"],
		 *       ],
		 *       _: () => "none or not matched",
		 *    });
		 * }
		 *
		 * assert.equal(matchNum(Some(5)), "5");
		 * assert.equal(matchNum(Some(7)), "< 10");
		 * assert.equal(matchNum(Some(25)), "> 20");
		 * assert.equal(matchNum(Some(15)), "none or not matched");
		 * assert.equal(matchNum(None), "none or not matched");
		 * ```
		 *
		 * ### Async
		 *
		 * A `condition` is always a sync function. The `result` can be an async
		 * function, providing that all branches return an async function.
		 *
		 * ### Chained Matching
		 *
		 * Chained matching is possible on any type. Branches are formed by associating
		 * a `condition` with a `result`, and the chain is an array of branches. The
		 * last item in a chain may be a function (called to determine the default
		 * result when no branches match).
		 *
		 * A `condition` can be a:
		 * - primitive (to test for equality)
		 * - filter function which returns a boolean (to use a custom test)
		 * - partial object/array of `conditions` (to test for matching keys)
		 * - `Some`, `Ok` or `Err` containing a `condition` which is not a filter
		 *   function (and which does not included a nested filter function).
		 * - function wrapped with `Fn` (to test for equality)
		 * - `_` or `Default` (to match any value at this position)
		 *
		 * A `result` can be:
		 * - any non-function value to be used as the result
		 * - a function which returns the result when called
		 * - a function wrapped with `Fn` to be used as the result
		 *
		 * If no branch matches and there is no default available, an exhausted error
		 * is thrown.
		 *
		 * #### Primitive
		 *
		 * The branch succeeds if the `condition` is strictly equal to the provided
		 * value.
		 *
		 * ```
		 * function matchNum(num: number): string {
		 *    return match(num, [
		 *       [5, "five"],
		 *       [10, "ten"],
		 *       [15, (x) => `fifteen (${x})`], // result function
		 *       () => "other",
		 *    ]);
		 * }
		 *
		 * assert.equal(matchNum(5), "five");
		 * assert.equal(matchNum(10), "ten");
		 * assert.equal(matchNum(15), "fifteen (15)");
		 * assert.equal(matchNum(20), "other");
		 * ```
		 *
		 * #### Filter Function
		 *
		 * The branch succeeds if the `condition` returns true.
		 *
		 * ```
		 * function matchNum(num: number): string {
		 *    return match(num, [
		 *       [5, "five"], // Primitive Match
		 *       [(x) => x < 20, "< 20"],
		 *       [(x) => x > 30, "> 30"],
		 *       () => "other",
		 *    ]);
		 * }
		 *
		 * assert.equal(matchNum(5), "five");
		 * assert.equal(matchNum(15), "< 20");
		 * assert.equal(matchNum(50), "> 30");
		 * assert.equal(matchNum(25), "other");
		 * ```
		 *
		 * #### Object
		 *
		 * The branch succeeds if all the keys in `condition` match those in the
		 * provided value. Using `_` allows any value (even undefined), but the key
		 * must still be present.
		 *
		 *
		 * ```
		 * interface ExampleObj {
		 *    a: number;
		 *    b?: { c: number };
		 *    o?: number;
		 * }
		 *
		 * function matchObj(obj: ExampleObj): string {
		 *    return match(obj, [
		 *       [{ a: 5 }, "a = 5"],
		 *       [{ b: { c: 5 } }, "c = 5"],
		 *       [{ a: 10, o: _ }, "a = 10, o = _"],
		 *       [{ a: 15, b: { c: (n) => n > 10 } }, "a = 15; c > 10"],
		 *       () => "other",
		 *    ]);
		 * }
		 *
		 * assert.equal(matchObj({ a: 5 }), "a = 5");
		 * assert.equal(matchObj({ a: 50, b: { c: 5 } }), "c = 5");
		 * assert.equal(matchObj({ a: 10 }), "other");
		 * assert.equal(matchObj({ a: 10, o: 1 }), "a = 10, o = _");
		 * assert.equal(matchObj({ a: 15, b: { c: 20 } }), "a = 15; c > 10");
		 * assert.equal(matchObj({ a: 8, b: { c: 8 }, o: 1 }), "other");
		 * ```
		 *
		 * #### Array
		 *
		 * The branch succeeds if all the indexes in `condition` match those in the
		 * provided value. Using `_` allows any value (even undefined), but the index
		 * must still be present.
		 *
		 * ```
		 * function matchArr(arr: number[]): string {
		 *    return match(arr, [
		 *       [[1], "1"],
		 *       [[2, (x) => x > 10], "2, > 10"],
		 *       [[_, 6, 9, _], (a) => a.join(", ")],
		 *       () => "other",
		 *    ]);
		 * }
		 *
		 * assert.equal(matchArr([1, 2, 3]), "1");
		 * assert.equal(matchArr([2, 12, 6]), "2, > 10");
		 * assert.equal(matchArr([3, 6, 9]), "other");
		 * assert.equal(matchArr([3, 6, 9, 12]), "3, 6, 9, 12");
		 * assert.equal(matchArr([2, 4, 6]), "other");
		 * ```
		 *
		 * #### Some, Ok and Err
		 *
		 * The branch succeeds if the wrapping monad (e.g. `Some`) is the same as the
		 * provided value and the inner `condition` matches the inner value.
		 *
		 * **Note:** Filter functions are not called for any condition wrapped in a
		 * monad. See the section on Combined Matching for a way to match inner values.
		 *
		 * ```
		 * type NumberMonad = Option<number> | Result<number, number>;
		 *
		 * function matchMonad(val: NumberMonad): string {
		 *    return match(val, [
		 *       [Some(1), "Some"],
		 *       [Ok(1), "Ok"],
		 *       [Err(1), "Err"],
		 *       () => "None",
		 *    ]);
		 * }
		 *
		 * assert.equal(matchMonad(Some(1)), "Some");
		 * assert.equal(matchMonad(Ok(1)), "Ok");
		 * assert.equal(matchMonad(Err(1)), "Err");
		 * assert.equal(matchMonad(None), "None");
		 * ```
		 *
		 * #### Fn (function as value)
		 *
		 * This wrapper distinguishes between a function to be called and a function to
		 * be treated as a value. It is needed where the function value could be confused
		 * with a filter function or result function.
		 *
		 * ```
		 * const fnOne = () => 1;
		 * const fnTwo = () => 2;
		 * const fnDefault = () => "fnDefault";
		 *
		 * function matchFn(fnVal: (...args: any) => any): () => string {
		 *    return match(fnVal, [
		 *       [Fn(fnOne), () => () => "fnOne"], // Manual result wrapper
		 *       [Fn(fnTwo), Fn(() => "fnTwo")], // Fn result wrapper
		 *       () => fnDefault,
		 *    ]);
		 * }
		 *
		 * assert.equal(matchFn(fnOne)(), "fnOne");
		 * assert.equal(matchFn(fnTwo)(), "fnTwo");
		 * assert.equal(matchFn(() => 0)(), "fnDefault");
		 * ```
		 */
		function match(val, pattern) {
		    return matchDispatch(val, pattern, exports.Default);
		}
		exports.match = match;
		match.compile = compile;
		function compile(pattern) {
		    return (val) => match(val, pattern);
		}
		/**
		 * The `Default` (or `_`) value. Used as a marker to indicate "any value".
		 */
		const Default = () => {
		    throw new Error("Match failed (exhausted)");
		};
		exports.Default = Default;
		/**
		 * The `_` value. Used as a marker to indicate "any value".
		 */
		exports._ = exports.Default;
		/**
		 * Creates a wrapper for a function so that it will be treated as a value
		 * within a chained matching block. See `match` for more information about
		 * when this needs to be used.
		 */
		function Fn(fn) {
		    const val = () => throwFnCalled();
		    val[common_1.FnVal] = fn;
		    return val;
		}
		exports.Fn = Fn;
		function matchMapped(val, pattern, defaultBranch) {
		    if (option_1.Option.is(val)) {
		        if (val[common_1.T]) {
		            if (pattern.Some) {
		                if (typeof pattern.Some === "function") {
		                    return pattern.Some(val[common_1.Val]);
		                }
		                else {
		                    return matchDispatch(val[common_1.Val], pattern.Some, typeof pattern._ === "function" ? pattern._ : defaultBranch);
		                }
		            }
		        }
		        else if (typeof pattern.None === "function") {
		            return pattern.None();
		        }
		    }
		    else if (result_1.Result.is(val)) {
		        const Branch = val[common_1.T] ? pattern.Ok : pattern.Err;
		        if (Branch) {
		            if (typeof Branch === "function") {
		                return Branch(val[common_1.Val]);
		            }
		            else {
		                return matchDispatch(val[common_1.Val], Branch, typeof pattern._ === "function" ? pattern._ : defaultBranch);
		            }
		        }
		    }
		    else {
		        throwInvalidPattern();
		    }
		    return typeof pattern._ === "function" ? pattern._() : defaultBranch();
		}
		function matchChained(val, pattern, defaultBranch) {
		    for (const branch of pattern) {
		        if (typeof branch === "function") {
		            return branch[common_1.FnVal] ? branch[common_1.FnVal] : branch();
		        }
		        else {
		            const [cond, result] = branch;
		            if (matches(cond, val, true)) {
		                if (typeof result === "function") {
		                    return result[common_1.FnVal]
		                        ? result[common_1.FnVal]
		                        : result(val);
		                }
		                else {
		                    return result;
		                }
		            }
		        }
		    }
		    return defaultBranch();
		}
		function matches(cond, val, evaluate) {
		    if (cond === exports.Default || cond === val) {
		        return true;
		    }
		    if (typeof cond === "function") {
		        return cond[common_1.FnVal]
		            ? cond[common_1.FnVal] === val
		            : evaluate && cond(val);
		    }
		    if (isObjectLike(cond)) {
		        if (common_1.T in cond) {
		            return (cond.isLike(val) &&
		                matches(cond[common_1.Val], val[common_1.Val], false));
		        }
		        if (isObjectLike(val) && Array.isArray(cond) === Array.isArray(val)) {
		            for (const key of Object.keys(cond)) {
		                if (!(key in val) ||
		                    !matches(cond[key], val[key], evaluate)) {
		                    return false;
		                }
		            }
		            return true;
		        }
		    }
		    return false;
		}
		function matchDispatch(val, pattern, defaultBranch) {
		    if (Array.isArray(pattern)) {
		        return matchChained(val, pattern, defaultBranch);
		    }
		    else if (isObjectLike(pattern)) {
		        return matchMapped(val, pattern, defaultBranch);
		    }
		    throwInvalidPattern();
		}
		function isObjectLike(value) {
		    return value !== null && typeof value === "object";
		}
		function throwInvalidPattern() {
		    throw new Error("Match failed (invalid pattern)");
		}
		function throwFnCalled() {
		    throw new Error("Match error (wrapped function called)");
		}
	} (match));

	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports._ = exports.Default = exports.Fn = exports.match = exports.Err = exports.Ok = exports.Result = exports.None = exports.Some = exports.Option = void 0;
		var option_1 = requireOption();
		Object.defineProperty(exports, "Option", { enumerable: true, get: function () { return option_1.Option; } });
		Object.defineProperty(exports, "Some", { enumerable: true, get: function () { return option_1.Some; } });
		Object.defineProperty(exports, "None", { enumerable: true, get: function () { return option_1.None; } });
		var result_1 = requireResult();
		Object.defineProperty(exports, "Result", { enumerable: true, get: function () { return result_1.Result; } });
		Object.defineProperty(exports, "Ok", { enumerable: true, get: function () { return result_1.Ok; } });
		Object.defineProperty(exports, "Err", { enumerable: true, get: function () { return result_1.Err; } });
		var match_1 = match;
		Object.defineProperty(exports, "match", { enumerable: true, get: function () { return match_1.match; } });
		Object.defineProperty(exports, "Fn", { enumerable: true, get: function () { return match_1.Fn; } });
		Object.defineProperty(exports, "Default", { enumerable: true, get: function () { return match_1.Default; } });
		Object.defineProperty(exports, "_", { enumerable: true, get: function () { return match_1._; } });
	} (dist));

	var engineExports = {};
	var engine = {
	  get exports(){ return engineExports; },
	  set exports(v){ engineExports = v; },
	};

	(function (module, exports) {
		!function (A, I) {
		  module.exports = I()
		    ;
		}("undefined" != typeof self ? self : commonjsGlobal, function () {
		  return (() => {
		    var A = {
		        80: () => {},
		        149: (A, I) => {
		          !function () {
		            for (
		              var A =
		                  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
		                g = new Uint8Array(256),
		                B = 0;
		              B < A.length;
		              B++
		            ) g[A.charCodeAt(B)] = B;
		            I.J = function (A) {
		                var I, B, Q, C, E, D = .75 * A.length, i = A.length, w = 0;
		                "=" === A[A.length - 1] &&
		                  (D--, "=" === A[A.length - 2] && D--);
		                var o = new ArrayBuffer(D), G = new Uint8Array(o);
		                for (I = 0; I < i; I += 4) {
		                  B = g[A.charCodeAt(I)],
		                    Q = g[A.charCodeAt(I + 1)],
		                    C = g[A.charCodeAt(I + 2)],
		                    E = g[A.charCodeAt(I + 3)],
		                    G[w++] = B << 2 | Q >> 4,
		                    G[w++] = (15 & Q) << 4 | C >> 2,
		                    G[w++] = (3 & C) << 6 | 63 & E;
		                }
		                return o;
		              };
		          }();
		        },
		        426: (A) => {
		          var I = function (A) {
		            var I,
		              g = Object.prototype,
		              B = g.hasOwnProperty,
		              Q = "function" == typeof Symbol ? Symbol : {},
		              C = Q.iterator || "@@iterator",
		              E = Q.asyncIterator || "@@asyncIterator",
		              D = Q.toStringTag || "@@toStringTag";
		            function i(A, I, g) {
		              return Object.defineProperty(A, I, {
		                value: g,
		                enumerable: !0,
		                configurable: !0,
		                writable: !0,
		              }),
		                A[I];
		            }
		            try {
		              i({}, "");
		            } catch (A) {
		              i = function (A, I, g) {
		                return A[I] = g;
		              };
		            }
		            function w(A, I, g, B) {
		              var Q = I && I.prototype instanceof y ? I : y,
		                C = Object.create(Q.prototype),
		                E = new q(B || []);
		              return C._invoke = function (A, I, g) {
		                var B = G;
		                return function (Q, C) {
		                  if (B === F) throw new Error("Generator is already running");
		                  if (B === k) {
		                    if ("throw" === Q) throw C;
		                    return d();
		                  }
		                  for (g.method = Q, g.arg = C;;) {
		                    var E = g.delegate;
		                    if (E) {
		                      var D = s(E, g);
		                      if (D) {
		                        if (D === M) continue;
		                        return D;
		                      }
		                    }
		                    if ("next" === g.method) g.sent = g._sent = g.arg;
		                    else if ("throw" === g.method) {
		                      if (B === G) throw B = k, g.arg;
		                      g.dispatchException(g.arg);
		                    } else "return" === g.method && g.abrupt("return", g.arg);
		                    B = F;
		                    var i = o(A, I, g);
		                    if ("normal" === i.type) {
		                      if (B = g.done ? k : N, i.arg === M) continue;
		                      return { value: i.arg, done: g.done };
		                    }
		                    "throw" === i.type &&
		                      (B = k, g.method = "throw", g.arg = i.arg);
		                  }
		                };
		              }(A, g, E),
		                C;
		            }
		            function o(A, I, g) {
		              try {
		                return { type: "normal", arg: A.call(I, g) };
		              } catch (A) {
		                return { type: "throw", arg: A };
		              }
		            }
		            A.wrap = w;
		            var G = "suspendedStart",
		              N = "suspendedYield",
		              F = "executing",
		              k = "completed",
		              M = {};
		            function y() {}
		            function J() {}
		            function R() {}
		            var h = {};
		            i(h, C, function () {
		              return this;
		            });
		            var a = Object.getPrototypeOf, Y = a && a(a(H([])));
		            Y && Y !== g && B.call(Y, C) && (h = Y);
		            var U = R.prototype = y.prototype = Object.create(h);
		            function c(A) {
		              ["next", "throw", "return"].forEach(function (I) {
		                i(A, I, function (A) {
		                  return this._invoke(I, A);
		                });
		              });
		            }
		            function S(A, I) {
		              function g(Q, C, E, D) {
		                var i = o(A[Q], A, C);
		                if ("throw" !== i.type) {
		                  var w = i.arg, G = w.value;
		                  return G && "object" == typeof G && B.call(G, "__await")
		                    ? I.resolve(G.__await).then(function (A) {
		                      g("next", A, E, D);
		                    }, function (A) {
		                      g("throw", A, E, D);
		                    })
		                    : I.resolve(G).then(function (A) {
		                      w.value = A, E(w);
		                    }, function (A) {
		                      return g("throw", A, E, D);
		                    });
		                }
		                D(i.arg);
		              }
		              var Q;
		              this._invoke = function (A, B) {
		                function C() {
		                  return new I(function (I, Q) {
		                    g(A, B, I, Q);
		                  });
		                }
		                return Q = Q ? Q.then(C, C) : C();
		              };
		            }
		            function s(A, g) {
		              var B = A.iterator[g.method];
		              if (B === I) {
		                if (g.delegate = null, "throw" === g.method) {
		                  if (
		                    A.iterator.return &&
		                    (g.method = "return",
		                      g.arg = I,
		                      s(A, g),
		                      "throw" === g.method)
		                  ) return M;
		                  g.method = "throw",
		                    g.arg = new TypeError(
		                      "The iterator does not provide a 'throw' method",
		                    );
		                }
		                return M;
		              }
		              var Q = o(B, A.iterator, g.arg);
		              if ("throw" === Q.type) {
		                return g.method = "throw", g.arg = Q.arg, g.delegate = null, M;
		              }
		              var C = Q.arg;
		              return C
		                ? C.done
		                  ? (g[A.resultName] = C.value,
		                    g.next = A.nextLoc,
		                    "return" !== g.method && (g.method = "next", g.arg = I),
		                    g.delegate = null,
		                    M)
		                  : C
		                : (g.method = "throw",
		                  g.arg = new TypeError("iterator result is not an object"),
		                  g.delegate = null,
		                  M);
		            }
		            function L(A) {
		              var I = { tryLoc: A[0] };
		              1 in A && (I.catchLoc = A[1]),
		                2 in A && (I.finallyLoc = A[2], I.afterLoc = A[3]),
		                this.tryEntries.push(I);
		            }
		            function K(A) {
		              var I = A.completion || {};
		              I.type = "normal", delete I.arg, A.completion = I;
		            }
		            function q(A) {
		              this.tryEntries = [{ tryLoc: "root" }],
		                A.forEach(L, this),
		                this.reset(!0);
		            }
		            function H(A) {
		              if (A) {
		                var g = A[C];
		                if (g) {
		                  return g.call(A);
		                }
		                if ("function" == typeof A.next) return A;
		                if (!isNaN(A.length)) {
		                  var Q = -1,
		                    E = function g() {
		                      for (; ++Q < A.length;) {
		                        if (B.call(A, Q)) {
		                          return g.value = A[Q], g.done = !1, g;
		                        }
		                      }
		                      return g.value = I, g.done = !0, g;
		                    };
		                  return E.next = E;
		                }
		              }
		              return { next: d };
		            }
		            function d() {
		              return { value: I, done: !0 };
		            }
		            return J.prototype = R,
		              i(U, "constructor", R),
		              i(R, "constructor", J),
		              J.displayName = i(R, D, "GeneratorFunction"),
		              A.isGeneratorFunction = function (A) {
		                var I = "function" == typeof A && A.constructor;
		                return !!I &&
		                  (I === J ||
		                    "GeneratorFunction" === (I.displayName || I.name));
		              },
		              A.mark = function (A) {
		                return Object.setPrototypeOf
		                  ? Object.setPrototypeOf(A, R)
		                  : (A.__proto__ = R, i(A, D, "GeneratorFunction")),
		                  A.prototype = Object.create(U),
		                  A;
		              },
		              A.awrap = function (A) {
		                return { __await: A };
		              },
		              c(S.prototype),
		              i(S.prototype, E, function () {
		                return this;
		              }),
		              A.AsyncIterator = S,
		              A.async = function (I, g, B, Q, C) {
		                void 0 === C && (C = Promise);
		                var E = new S(w(I, g, B, Q), C);
		                return A.isGeneratorFunction(g)
		                  ? E
		                  : E.next().then(function (A) {
		                    return A.done ? A.value : E.next();
		                  });
		              },
		              c(U),
		              i(U, D, "Generator"),
		              i(U, C, function () {
		                return this;
		              }),
		              i(U, "toString", function () {
		                return "[object Generator]";
		              }),
		              A.keys = function (A) {
		                var I = [];
		                for (var g in A) I.push(g);
		                return I.reverse(), function g() {
		                  for (; I.length;) {
		                    var B = I.pop();
		                    if (B in A) return g.value = B, g.done = !1, g;
		                  }
		                  return g.done = !0, g;
		                };
		              },
		              A.values = H,
		              q.prototype = {
		                constructor: q,
		                reset: function (A) {
		                  if (
		                    this.prev = 0,
		                      this.next = 0,
		                      this.sent = this._sent = I,
		                      this.done = !1,
		                      this.delegate = null,
		                      this.method = "next",
		                      this.arg = I,
		                      this.tryEntries.forEach(K),
		                      !A
		                  ) {
		                    for (var g in this) {
		                      "t" === g.charAt(0) && B.call(this, g) &&
		                        !isNaN(+g.slice(1)) && (this[g] = I);
		                    }
		                  }
		                },
		                stop: function () {
		                  this.done = !0;
		                  var A = this.tryEntries[0].completion;
		                  if ("throw" === A.type) throw A.arg;
		                  return this.rval;
		                },
		                dispatchException: function (A) {
		                  if (this.done) throw A;
		                  var g = this;
		                  function Q(B, Q) {
		                    return D.type = "throw",
		                      D.arg = A,
		                      g.next = B,
		                      Q && (g.method = "next", g.arg = I),
		                      !!Q;
		                  }
		                  for (var C = this.tryEntries.length - 1; C >= 0; --C) {
		                    var E = this.tryEntries[C], D = E.completion;
		                    if ("root" === E.tryLoc) return Q("end");
		                    if (E.tryLoc <= this.prev) {
		                      var i = B.call(E, "catchLoc"),
		                        w = B.call(E, "finallyLoc");
		                      if (i && w) {
		                        if (this.prev < E.catchLoc) return Q(E.catchLoc, !0);
		                        if (this.prev < E.finallyLoc) return Q(E.finallyLoc);
		                      } else if (i) {
		                        if (this.prev < E.catchLoc) {
		                          return Q(E.catchLoc, !0);
		                        }
		                      } else {
		                        if (!w) {
		                          throw new Error(
		                            "try statement without catch or finally",
		                          );
		                        }
		                        if (this.prev < E.finallyLoc) return Q(E.finallyLoc);
		                      }
		                    }
		                  }
		                },
		                abrupt: function (A, I) {
		                  for (var g = this.tryEntries.length - 1; g >= 0; --g) {
		                    var Q = this.tryEntries[g];
		                    if (
		                      Q.tryLoc <= this.prev && B.call(Q, "finallyLoc") &&
		                      this.prev < Q.finallyLoc
		                    ) {
		                      var C = Q;
		                      break;
		                    }
		                  }
		                  C && ("break" === A || "continue" === A) && C.tryLoc <= I &&
		                    I <= C.finallyLoc && (C = null);
		                  var E = C ? C.completion : {};
		                  return E.type = A,
		                    E.arg = I,
		                    C
		                      ? (this.method = "next", this.next = C.finallyLoc, M)
		                      : this.complete(E);
		                },
		                complete: function (A, I) {
		                  if ("throw" === A.type) {
		                    throw A.arg;
		                  }
		                  return "break" === A.type || "continue" === A.type
		                    ? this.next = A.arg
		                    : "return" === A.type
		                    ? (this.rval = this.arg = A.arg,
		                      this.method = "return",
		                      this.next = "end")
		                    : "normal" === A.type && I && (this.next = I),
		                    M;
		                },
		                finish: function (A) {
		                  for (var I = this.tryEntries.length - 1; I >= 0; --I) {
		                    var g = this.tryEntries[I];
		                    if (g.finallyLoc === A) {
		                      return this.complete(g.completion, g.afterLoc), K(g), M;
		                    }
		                  }
		                },
		                catch: function (A) {
		                  for (var I = this.tryEntries.length - 1; I >= 0; --I) {
		                    var g = this.tryEntries[I];
		                    if (g.tryLoc === A) {
		                      var B = g.completion;
		                      if ("throw" === B.type) {
		                        var Q = B.arg;
		                        K(g);
		                      }
		                      return Q;
		                    }
		                  }
		                  throw new Error("illegal catch attempt");
		                },
		                delegateYield: function (A, g, B) {
		                  return this.delegate = {
		                    iterator: H(A),
		                    resultName: g,
		                    nextLoc: B,
		                  },
		                    "next" === this.method && (this.arg = I),
		                    M;
		                },
		              },
		              A;
		          }(A.exports);
		          try {
		            regeneratorRuntime = I;
		          } catch (A) {
		            "object" == typeof globalThis
		              ? globalThis.regeneratorRuntime = I
		              : Function("r", "regeneratorRuntime = r")(I);
		          }
		        },
		      },
		      I = {};
		    function g(B) {
		      var Q = I[B];
		      if (void 0 !== Q) {
		        return Q.exports;
		      }
		      var C = I[B] = { exports: {} };
		      return A[B](C, C.exports, g), C.exports;
		    }
		    g.d = (A, I) => {
		      for (var B in I) {
		        g.o(I, B) && !g.o(A, B) &&
		          Object.defineProperty(A, B, { enumerable: !0, get: I[B] });
		      }
		    },
		      g.g = function () {
		        if ("object" == typeof globalThis) return globalThis;
		        try {
		          return this || new Function("return this")();
		        } catch (A) {
		          if ("object" == typeof window) return window;
		        }
		      }(),
		      g.o = (A, I) => Object.prototype.hasOwnProperty.call(A, I);
		    var B = {};
		    return (() => {
		      g.d(B, { default: () => C });
		      g(426);
		      var A = g(149), I = g(80);
		      class Q {
		        constructor(A = { nodejs: !1 }) {
		          if (
		            this._isInitialized = !1,
		              this._wbg = null,
		              this._wasm = null,
		              A.nodejs
		          ) {
		            const A = g.g.require("util");
		            g.g.TextEncoder = A.TextEncoder, g.g.TextDecoder = A.TextDecoder;
		          }
		          const I = (new TextDecoder()).decode(Q.getPkgJs()),
		            B = new Function(`return () => { ${I} return wasm_bindgen; };`)
		              .call(null);
		          this._wbg = B();
		        }
		        async init() {
		          if (this._isInitialized) throw new Error("Already initialized");
		          return this._isInitialized = !0,
		            this._wasm = await this._wbg(Q.getPkgWasm()),
		            this._wbg;
		        }
		        static async create(A = { nodejs: !1 }) {
		          return await new Q(A).init();
		        }
		        getWasm() {
		          return this._wasm;
		        }
		        static getPkgJs() {
		          return (0, A.J)(
		            "bGV0IHdhc21fYmluZGdlbjsKKGZ1bmN0aW9uKCkgewogICAgY29uc3QgX19leHBvcnRzID0ge307CiAgICBsZXQgd2FzbTsKCiAgICBjb25zdCBjYWNoZWRUZXh0RGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcigndXRmLTgnLCB7IGlnbm9yZUJPTTogdHJ1ZSwgZmF0YWw6IHRydWUgfSk7CgogICAgY2FjaGVkVGV4dERlY29kZXIuZGVjb2RlKCk7CgogICAgbGV0IGNhY2hlZ2V0VWludDhNZW1vcnkwID0gbnVsbDsKICAgIGZ1bmN0aW9uIGdldFVpbnQ4TWVtb3J5MCgpIHsKICAgICAgICBpZiAoY2FjaGVnZXRVaW50OE1lbW9yeTAgPT09IG51bGwgfHwgY2FjaGVnZXRVaW50OE1lbW9yeTAuYnVmZmVyICE9PSB3YXNtLm1lbW9yeS5idWZmZXIpIHsKICAgICAgICAgICAgY2FjaGVnZXRVaW50OE1lbW9yeTAgPSBuZXcgVWludDhBcnJheSh3YXNtLm1lbW9yeS5idWZmZXIpOwogICAgICAgIH0KICAgICAgICByZXR1cm4gY2FjaGVnZXRVaW50OE1lbW9yeTA7CiAgICB9CgogICAgZnVuY3Rpb24gZ2V0U3RyaW5nRnJvbVdhc20wKHB0ciwgbGVuKSB7CiAgICAgICAgcmV0dXJuIGNhY2hlZFRleHREZWNvZGVyLmRlY29kZShnZXRVaW50OE1lbW9yeTAoKS5zdWJhcnJheShwdHIsIHB0ciArIGxlbikpOwogICAgfQoKICAgIGNvbnN0IGhlYXAgPSBuZXcgQXJyYXkoMzIpLmZpbGwodW5kZWZpbmVkKTsKCiAgICBoZWFwLnB1c2godW5kZWZpbmVkLCBudWxsLCB0cnVlLCBmYWxzZSk7CgogICAgbGV0IGhlYXBfbmV4dCA9IGhlYXAubGVuZ3RoOwoKICAgIGZ1bmN0aW9uIGFkZEhlYXBPYmplY3Qob2JqKSB7CiAgICAgICAgaWYgKGhlYXBfbmV4dCA9PT0gaGVhcC5sZW5ndGgpIGhlYXAucHVzaChoZWFwLmxlbmd0aCArIDEpOwogICAgICAgIGNvbnN0IGlkeCA9IGhlYXBfbmV4dDsKICAgICAgICBoZWFwX25leHQgPSBoZWFwW2lkeF07CgogICAgICAgIGhlYXBbaWR4XSA9IG9iajsKICAgICAgICByZXR1cm4gaWR4OwogICAgfQoKZnVuY3Rpb24gZ2V0T2JqZWN0KGlkeCkgeyByZXR1cm4gaGVhcFtpZHhdOyB9CgpsZXQgV0FTTV9WRUNUT1JfTEVOID0gMDsKCmNvbnN0IGNhY2hlZFRleHRFbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCd1dGYtOCcpOwoKY29uc3QgZW5jb2RlU3RyaW5nID0gKHR5cGVvZiBjYWNoZWRUZXh0RW5jb2Rlci5lbmNvZGVJbnRvID09PSAnZnVuY3Rpb24nCiAgICA/IGZ1bmN0aW9uIChhcmcsIHZpZXcpIHsKICAgIHJldHVybiBjYWNoZWRUZXh0RW5jb2Rlci5lbmNvZGVJbnRvKGFyZywgdmlldyk7Cn0KICAgIDogZnVuY3Rpb24gKGFyZywgdmlldykgewogICAgY29uc3QgYnVmID0gY2FjaGVkVGV4dEVuY29kZXIuZW5jb2RlKGFyZyk7CiAgICB2aWV3LnNldChidWYpOwogICAgcmV0dXJuIHsKICAgICAgICByZWFkOiBhcmcubGVuZ3RoLAogICAgICAgIHdyaXR0ZW46IGJ1Zi5sZW5ndGgKICAgIH07Cn0pOwoKZnVuY3Rpb24gcGFzc1N0cmluZ1RvV2FzbTAoYXJnLCBtYWxsb2MsIHJlYWxsb2MpIHsKCiAgICBpZiAocmVhbGxvYyA9PT0gdW5kZWZpbmVkKSB7CiAgICAgICAgY29uc3QgYnVmID0gY2FjaGVkVGV4dEVuY29kZXIuZW5jb2RlKGFyZyk7CiAgICAgICAgY29uc3QgcHRyID0gbWFsbG9jKGJ1Zi5sZW5ndGgpOwogICAgICAgIGdldFVpbnQ4TWVtb3J5MCgpLnN1YmFycmF5KHB0ciwgcHRyICsgYnVmLmxlbmd0aCkuc2V0KGJ1Zik7CiAgICAgICAgV0FTTV9WRUNUT1JfTEVOID0gYnVmLmxlbmd0aDsKICAgICAgICByZXR1cm4gcHRyOwogICAgfQoKICAgIGxldCBsZW4gPSBhcmcubGVuZ3RoOwogICAgbGV0IHB0ciA9IG1hbGxvYyhsZW4pOwoKICAgIGNvbnN0IG1lbSA9IGdldFVpbnQ4TWVtb3J5MCgpOwoKICAgIGxldCBvZmZzZXQgPSAwOwoKICAgIGZvciAoOyBvZmZzZXQgPCBsZW47IG9mZnNldCsrKSB7CiAgICAgICAgY29uc3QgY29kZSA9IGFyZy5jaGFyQ29kZUF0KG9mZnNldCk7CiAgICAgICAgaWYgKGNvZGUgPiAweDdGKSBicmVhazsKICAgICAgICBtZW1bcHRyICsgb2Zmc2V0XSA9IGNvZGU7CiAgICB9CgogICAgaWYgKG9mZnNldCAhPT0gbGVuKSB7CiAgICAgICAgaWYgKG9mZnNldCAhPT0gMCkgewogICAgICAgICAgICBhcmcgPSBhcmcuc2xpY2Uob2Zmc2V0KTsKICAgICAgICB9CiAgICAgICAgcHRyID0gcmVhbGxvYyhwdHIsIGxlbiwgbGVuID0gb2Zmc2V0ICsgYXJnLmxlbmd0aCAqIDMpOwogICAgICAgIGNvbnN0IHZpZXcgPSBnZXRVaW50OE1lbW9yeTAoKS5zdWJhcnJheShwdHIgKyBvZmZzZXQsIHB0ciArIGxlbik7CiAgICAgICAgY29uc3QgcmV0ID0gZW5jb2RlU3RyaW5nKGFyZywgdmlldyk7CgogICAgICAgIG9mZnNldCArPSByZXQud3JpdHRlbjsKICAgIH0KCiAgICBXQVNNX1ZFQ1RPUl9MRU4gPSBvZmZzZXQ7CiAgICByZXR1cm4gcHRyOwp9CgpsZXQgY2FjaGVnZXRJbnQzMk1lbW9yeTAgPSBudWxsOwpmdW5jdGlvbiBnZXRJbnQzMk1lbW9yeTAoKSB7CiAgICBpZiAoY2FjaGVnZXRJbnQzMk1lbW9yeTAgPT09IG51bGwgfHwgY2FjaGVnZXRJbnQzMk1lbW9yeTAuYnVmZmVyICE9PSB3YXNtLm1lbW9yeS5idWZmZXIpIHsKICAgICAgICBjYWNoZWdldEludDMyTWVtb3J5MCA9IG5ldyBJbnQzMkFycmF5KHdhc20ubWVtb3J5LmJ1ZmZlcik7CiAgICB9CiAgICByZXR1cm4gY2FjaGVnZXRJbnQzMk1lbW9yeTA7Cn0KCmxldCBzdGFja19wb2ludGVyID0gMzI7CgpmdW5jdGlvbiBhZGRCb3Jyb3dlZE9iamVjdChvYmopIHsKICAgIGlmIChzdGFja19wb2ludGVyID09IDEpIHRocm93IG5ldyBFcnJvcignb3V0IG9mIGpzIHN0YWNrJyk7CiAgICBoZWFwWy0tc3RhY2tfcG9pbnRlcl0gPSBvYmo7CiAgICByZXR1cm4gc3RhY2tfcG9pbnRlcjsKfQoKZnVuY3Rpb24gZHJvcE9iamVjdChpZHgpIHsKICAgIGlmIChpZHggPCAzNikgcmV0dXJuOwogICAgaGVhcFtpZHhdID0gaGVhcF9uZXh0OwogICAgaGVhcF9uZXh0ID0gaWR4Owp9CgpmdW5jdGlvbiB0YWtlT2JqZWN0KGlkeCkgewogICAgY29uc3QgcmV0ID0gZ2V0T2JqZWN0KGlkeCk7CiAgICBkcm9wT2JqZWN0KGlkeCk7CiAgICByZXR1cm4gcmV0Owp9Ci8qKgoqIEBwYXJhbSB7YW55fSBub2RlCiogQHBhcmFtIHthbnl9IHBhdHRlcm4KKiBAcGFyYW0ge2FueX0gcmVmZXJlbmNlZF9ub2RlcwoqIEByZXR1cm5zIHthbnl9CiovCl9fZXhwb3J0cy5maW5kX21hdGNoZXMgPSBmdW5jdGlvbihub2RlLCBwYXR0ZXJuLCByZWZlcmVuY2VkX25vZGVzKSB7CiAgICB0cnkgewogICAgICAgIGNvbnN0IHJldCA9IHdhc20uZmluZF9tYXRjaGVzKGFkZEJvcnJvd2VkT2JqZWN0KG5vZGUpLCBhZGRCb3Jyb3dlZE9iamVjdChwYXR0ZXJuKSwgYWRkQm9ycm93ZWRPYmplY3QocmVmZXJlbmNlZF9ub2RlcykpOwogICAgICAgIHJldHVybiB0YWtlT2JqZWN0KHJldCk7CiAgICB9IGZpbmFsbHkgewogICAgICAgIGhlYXBbc3RhY2tfcG9pbnRlcisrXSA9IHVuZGVmaW5lZDsKICAgICAgICBoZWFwW3N0YWNrX3BvaW50ZXIrK10gPSB1bmRlZmluZWQ7CiAgICAgICAgaGVhcFtzdGFja19wb2ludGVyKytdID0gdW5kZWZpbmVkOwogICAgfQp9OwoKLyoqCiovCmNsYXNzIEdNRU5vZGUgewoKICAgIHN0YXRpYyBfX3dyYXAocHRyKSB7CiAgICAgICAgY29uc3Qgb2JqID0gT2JqZWN0LmNyZWF0ZShHTUVOb2RlLnByb3RvdHlwZSk7CiAgICAgICAgb2JqLnB0ciA9IHB0cjsKCiAgICAgICAgcmV0dXJuIG9iajsKICAgIH0KCiAgICBfX2Rlc3Ryb3lfaW50b19yYXcoKSB7CiAgICAgICAgY29uc3QgcHRyID0gdGhpcy5wdHI7CiAgICAgICAgdGhpcy5wdHIgPSAwOwoKICAgICAgICByZXR1cm4gcHRyOwogICAgfQoKICAgIGZyZWUoKSB7CiAgICAgICAgY29uc3QgcHRyID0gdGhpcy5fX2Rlc3Ryb3lfaW50b19yYXcoKTsKICAgICAgICB3YXNtLl9fd2JnX2dtZW5vZGVfZnJlZShwdHIpOwogICAgfQogICAgLyoqCiAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZAogICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZQogICAgKi8KICAgIGNvbnN0cnVjdG9yKGlkLCBuYW1lKSB7CiAgICAgICAgY29uc3QgcHRyMCA9IHBhc3NTdHJpbmdUb1dhc20wKGlkLCB3YXNtLl9fd2JpbmRnZW5fbWFsbG9jLCB3YXNtLl9fd2JpbmRnZW5fcmVhbGxvYyk7CiAgICAgICAgY29uc3QgbGVuMCA9IFdBU01fVkVDVE9SX0xFTjsKICAgICAgICBjb25zdCBwdHIxID0gcGFzc1N0cmluZ1RvV2FzbTAobmFtZSwgd2FzbS5fX3diaW5kZ2VuX21hbGxvYywgd2FzbS5fX3diaW5kZ2VuX3JlYWxsb2MpOwogICAgICAgIGNvbnN0IGxlbjEgPSBXQVNNX1ZFQ1RPUl9MRU47CiAgICAgICAgY29uc3QgcmV0ID0gd2FzbS5nbWVub2RlX25ldyhwdHIwLCBsZW4wLCBwdHIxLCBsZW4xKTsKICAgICAgICByZXR1cm4gR01FTm9kZS5fX3dyYXAocmV0KTsKICAgIH0KfQpfX2V4cG9ydHMuR01FTm9kZSA9IEdNRU5vZGU7Cgphc3luYyBmdW5jdGlvbiBsb2FkKG1vZHVsZSwgaW1wb3J0cykgewogICAgaWYgKHR5cGVvZiBSZXNwb25zZSA9PT0gJ2Z1bmN0aW9uJyAmJiBtb2R1bGUgaW5zdGFuY2VvZiBSZXNwb25zZSkgewogICAgICAgIGlmICh0eXBlb2YgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVTdHJlYW1pbmcgPT09ICdmdW5jdGlvbicpIHsKICAgICAgICAgICAgdHJ5IHsKICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZVN0cmVhbWluZyhtb2R1bGUsIGltcG9ydHMpOwoKICAgICAgICAgICAgfSBjYXRjaCAoZSkgewogICAgICAgICAgICAgICAgaWYgKG1vZHVsZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgIT0gJ2FwcGxpY2F0aW9uL3dhc20nKSB7CiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCJgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGVTdHJlYW1pbmdgIGZhaWxlZCBiZWNhdXNlIHlvdXIgc2VydmVyIGRvZXMgbm90IHNlcnZlIHdhc20gd2l0aCBgYXBwbGljYXRpb24vd2FzbWAgTUlNRSB0eXBlLiBGYWxsaW5nIGJhY2sgdG8gYFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlYCB3aGljaCBpcyBzbG93ZXIuIE9yaWdpbmFsIGVycm9yOlxuIiwgZSk7CgogICAgICAgICAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgICAgICAgICB0aHJvdyBlOwogICAgICAgICAgICAgICAgfQogICAgICAgICAgICB9CiAgICAgICAgfQoKICAgICAgICBjb25zdCBieXRlcyA9IGF3YWl0IG1vZHVsZS5hcnJheUJ1ZmZlcigpOwogICAgICAgIHJldHVybiBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZShieXRlcywgaW1wb3J0cyk7CgogICAgfSBlbHNlIHsKICAgICAgICBjb25zdCBpbnN0YW5jZSA9IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKG1vZHVsZSwgaW1wb3J0cyk7CgogICAgICAgIGlmIChpbnN0YW5jZSBpbnN0YW5jZW9mIFdlYkFzc2VtYmx5Lkluc3RhbmNlKSB7CiAgICAgICAgICAgIHJldHVybiB7IGluc3RhbmNlLCBtb2R1bGUgfTsKCiAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlOwogICAgICAgIH0KICAgIH0KfQoKYXN5bmMgZnVuY3Rpb24gaW5pdChpbnB1dCkgewogICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3VuZGVmaW5lZCcpIHsKICAgICAgICBsZXQgc3JjOwogICAgICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7CiAgICAgICAgICAgIHNyYyA9IGxvY2F0aW9uLmhyZWY7CiAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgc3JjID0gZG9jdW1lbnQuY3VycmVudFNjcmlwdC5zcmM7CiAgICAgICAgfQogICAgICAgIGlucHV0ID0gc3JjLnJlcGxhY2UoL1wuanMkLywgJ19iZy53YXNtJyk7CiAgICB9CiAgICBjb25zdCBpbXBvcnRzID0ge307CiAgICBpbXBvcnRzLndiZyA9IHt9OwogICAgaW1wb3J0cy53YmcuX193YmluZGdlbl9qc29uX3BhcnNlID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkgewogICAgICAgIGNvbnN0IHJldCA9IEpTT04ucGFyc2UoZ2V0U3RyaW5nRnJvbVdhc20wKGFyZzAsIGFyZzEpKTsKICAgICAgICByZXR1cm4gYWRkSGVhcE9iamVjdChyZXQpOwogICAgfTsKICAgIGltcG9ydHMud2JnLl9fd2JpbmRnZW5fanNvbl9zZXJpYWxpemUgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7CiAgICAgICAgY29uc3Qgb2JqID0gZ2V0T2JqZWN0KGFyZzEpOwogICAgICAgIGNvbnN0IHJldCA9IEpTT04uc3RyaW5naWZ5KG9iaiA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IG9iaik7CiAgICAgICAgY29uc3QgcHRyMCA9IHBhc3NTdHJpbmdUb1dhc20wKHJldCwgd2FzbS5fX3diaW5kZ2VuX21hbGxvYywgd2FzbS5fX3diaW5kZ2VuX3JlYWxsb2MpOwogICAgICAgIGNvbnN0IGxlbjAgPSBXQVNNX1ZFQ1RPUl9MRU47CiAgICAgICAgZ2V0SW50MzJNZW1vcnkwKClbYXJnMCAvIDQgKyAxXSA9IGxlbjA7CiAgICAgICAgZ2V0SW50MzJNZW1vcnkwKClbYXJnMCAvIDQgKyAwXSA9IHB0cjA7CiAgICB9OwogICAgaW1wb3J0cy53YmcuX193YmdfbG9nX2E2Mjk1MWQxMzk0Y2Q0YzkgPSBmdW5jdGlvbihhcmcwLCBhcmcxKSB7CiAgICAgICAgY29uc29sZS5sb2coZ2V0U3RyaW5nRnJvbVdhc20wKGFyZzAsIGFyZzEpKTsKICAgIH07CiAgICBpbXBvcnRzLndiZy5fX3diaW5kZ2VuX3Rocm93ID0gZnVuY3Rpb24oYXJnMCwgYXJnMSkgewogICAgICAgIHRocm93IG5ldyBFcnJvcihnZXRTdHJpbmdGcm9tV2FzbTAoYXJnMCwgYXJnMSkpOwogICAgfTsKCiAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyB8fCAodHlwZW9mIFJlcXVlc3QgPT09ICdmdW5jdGlvbicgJiYgaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB8fCAodHlwZW9mIFVSTCA9PT0gJ2Z1bmN0aW9uJyAmJiBpbnB1dCBpbnN0YW5jZW9mIFVSTCkpIHsKICAgICAgICBpbnB1dCA9IGZldGNoKGlucHV0KTsKICAgIH0KCgoKICAgIGNvbnN0IHsgaW5zdGFuY2UsIG1vZHVsZSB9ID0gYXdhaXQgbG9hZChhd2FpdCBpbnB1dCwgaW1wb3J0cyk7CgogICAgd2FzbSA9IGluc3RhbmNlLmV4cG9ydHM7CiAgICBpbml0Ll9fd2JpbmRnZW5fd2FzbV9tb2R1bGUgPSBtb2R1bGU7CgogICAgcmV0dXJuIHdhc207Cn0KCndhc21fYmluZGdlbiA9IE9iamVjdC5hc3NpZ24oaW5pdCwgX19leHBvcnRzKTsKCn0pKCk7Cg==",
		          );
		        }
		        static getPkgWasm() {
		          return (0, A.J)(
		            "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AWogAkHwAmopAwA3AgAgAiACKQLMAiIUNwOQASACIAIpA+gCNwKsASACKALIAiEDIAJB4ABqIBM3AwAgAkHYAGogEjcDACACQYgBaiACQcgBaigCADYCACACQYABaiACQcABaikDADcDACACQfgAaiACQbgBaikDADcDACACQfAAaiACQbABaikDADcDACACQegAaiAFKQMANwMAIAIgFDcDUAwCCyACQdgCahC2AQtBAyEEIBCnIgZFDQAgCRAdCyABIAEtABhBAWo6ABggARDKASEFIAJBnAFqIAJB2ABqKQMANwIAIAJBpAFqIAJB4ABqKQMANwIAIAJBrAFqIAJB6ABqKQMANwIAIAJBtAFqIAJB8ABqKQMANwIAIAJBvAFqIAJB+ABqKQMANwIAIAJBxAFqIAJBgAFqKQMANwIAIAJBzAFqIAJBiAFqKAIANgIAIAIgAzYCkAEgAiAMOgDpASACIAY2AtwBIAIgCTYC0AEgAiACKQNQNwKUASACIBA3AtQBIAIgETcD4AEgAiAEOgDoASACQe4BaiACQfwBai8BADsBACACIAU2AvABIAIgAigB+AE2AeoBIBFCIIggEEIgiCETIBGnIQcgEKchCgJAAkACQCAEQQNHBEAgBQ0BIAJBQGsgAkGIAWooAgA2AgAgAkE4aiACQYABaikDADcDACACQTBqIAJB+ABqKQMANwMAIAJBKGogAkHwAGopAwA3AwAgAkEgaiACQegAaikDADcDACACQRhqIAJB4ABqKQMANwMAIAJBEGogAkHYAGopAwA3AwAgAiACKQNQNwMIIAIgAkHpAWoiBSgAADYCACACIAVBA2ooAAA2AAMMAwsgBQ0BQQMhBAwCCyAKBEAgCRAdCyACQaABahC2ASACQcABahC+ASACQdwBahCJAkEDIQQgBwRAIAYQHQsgBSEDDAELIAJB8AFqEI0CQQMhBAunIQggE6chDAwMCyACQRU2ApABIAEgAkGQAWoQwgIMAQsgAkEVNgKQASABIAJBkAFqEMICCyEBIABBAzoAWCAAIAE2AgAMCwsgAkHYAmoQtgEgB0ULIQ0gBEUhBCAKRQ0AIAkQHQsgCUEARyEPDAILQQEhBAwBCyACQQM2ApABIAEgAkGQAWoQwgIhA0EBIQQLIAIoArgCIgZFDQELIAJBuAJqEIkCIAIoArwCIgdFDQAgBhAdCyACKAKsAkUgDUVyRQRAIAJBqAJqEL4BCyACKAKMAkUgBEEBc3JFBEAgAkGIAmoQtgELQQMhBCAKRSAJRSAPcnJFBEAgCRAdCwsgASABLQAYQQFqOgAYIAEQ+wEhBSACQZwBaiACQdgAaikDADcCACACQaQBaiACQeAAaikDADcCACACQawBaiACQegAaikDADcCACACQbQBaiACQfAAaikDADcCACACQbwBaiACQfgAaikDADcCACACQcQBaiACQYABaikDADcCACACQcwBaiACQYgBaigCADYCACACIAM2ApABIAIgCzoA6QEgAiAINgLkASACIAc2AuABIAIgBjYC3AEgAiAMNgLYASACIAo2AtQBIAIgCTYC0AEgAiACKQNQNwKUASACIAQ6AOgBIAJB7gFqIAJBzgBqLwEAOwEAIAIgBTYC8AEgAiACKAFKNgHqASAEQf8BcUEDRwRAIAVFBEAgAkFAayACQYgBaigCADYCACACQThqIAJBgAFqKQMANwMAIAJBMGogAkH4AGopAwA3AwAgAkEoaiACQfAAaikDADcDACACQSBqIAJB6ABqKQMANwMAIAJBGGogAkHgAGopAwA3AwAgAkEQaiACQdgAaikDADcDACACIAIpA1A3AwggAiACQekBaiIFKAAANgIAIAIgBUEDaigAADYAAwwCCyAKBEAgCRAdCyACQaABahC2ASACQcABahC+ASACQdwBahCJAkEDIQQgBwRAIAYQHQsgBSEDDAELIAUEQCACQfABahCNAgtBAyEECyAEQf8BcUEDRg0AIAAgAikDCDcCBCAAIAg2AlQgACAHNgJQIAAgBjYCTCAAIAw2AkggACAKNgJEIAAgCTYCQCAAQTxqIAJBQGsoAgA2AgAgAEE0aiACQThqKQMANwIAIABBLGogAkEwaikDADcCACAAQSRqIAJBKGopAwA3AgAgAEEcaiACQSBqKQMANwIAIABBFGogAkEYaikDADcCACAAQQxqIAJBEGopAwA3AgAgACAEOgBYIAAgAzYCACAAIAIoAgA2AFkgAEHcAGogAigAAzYAAAwBCyADIAEQxgIhASAAQQM6AFggACABNgIACyACQZADaiQAC7ceAhN/A34jAEHwAGsiAiQAAkACQCABKAIIIgMgASgCBCIFSQRAIAEoAgAhBANAIAMgBGot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IghBA01BACAIQQFHGw0AAkAgCUEDcUEBaw4CAQEACyADQQRqIglBBGooAgBFDQAgCSgCABAdCyADQRhqIQMgB0FoaiIHDQALCyAGBEAgBRAdCyALBEAgDBAdCwwDCyACQdgAahCNAiAGIQQMAgsgBUUNASAAIA42AhQgACALNgIQIAAgDDYCDCAAIAk2AgggACAENgIEIAAgBTYCAAwCCyACQRU2AkAgASACQUBrEMICIQEgAEEANgIAIAAgATYCBAwBCyAEIAEQxgIhASAAQQA2AgAgACABNgIECyACQfAAaiQAC4MQAgh/Fn4jAEEwayIFJAACQAJAAkACQAJAAkAgASkDACIMUEUEQCABKQMIIg1QRQRAIAEpAxAiC1BFBEAgCyAMfCILIAxaBEAgDCANfSINIAxYBEACQAJAIAtC//////////8fWARAIAUgAS8BGCIBOwEIIAUgDTcDACABIAFBYGogASALQoCAgIAQVCIDGyIEQXBqIAQgC0IghiALIAMbIgtCgICAgICAwABUIgMbIgRBeGogBCALQhCGIAsgAxsiC0KAgICAgICAgAFUIgMbIgRBfGogBCALQgiGIAsgAxsiC0KAgICAgICAgBBUIgMbIgRBfmogBCALQgSGIAsgAxsiC0KAgICAgICAgMAAVCIDGyALQgKGIAsgAxsiDkI/h6dBf3NqIgNrQRB0QRB1IgRBAEgNAiAFQn8gBK0iD4giCyANgzcDECANIAtWDQ0gBSABOwEIIAUgDDcDACAFIAsgDIM3AxAgDCALVg0NQaB/IANrQRB0QRB1QdAAbEGwpwVqQc4QbSIBQdEATw0BIAFBBHQiAUHYgcEAaikDACIRQv////8PgyILIAwgD0I/gyIMhiIQQiCIIhd+IhJCIIgiHSARQiCIIg8gF358IA8gEEL/////D4MiEX4iEEIgiCIefCASQv////8PgyALIBF+QiCIfCAQQv////8Pg3xCgICAgAh8QiCIIRlCAUEAIAMgAUHggcEAai8BAGprQT9xrSIShiIRQn98IRUgCyANIAyGIgxCIIgiDX4iEEL/////D4MgCyAMQv////8PgyIMfkIgiHwgDCAPfiIMQv////8Pg3xCgICAgAh8QiCIIRYgDSAPfiENIAxCIIghDCAQQiCIIRAgAUHigcEAai8BACEBAn8CQAJAIA8g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Ig1xIgYhAyAFIAZqKQAAQoCBgoSIkKDAgH+DIhJQBEBBCCECIAYhAwNAIAIgA2ohAyACQQhqIQIgBSADIAhxIgNqKQAAQoCBgoSIkKDAgH+DIhJQDQALCyAFIBJ6p0EDdiADaiAIcSIDaiwAAEF/SgRAIAUpAwBCgIGChIiQoMCAf4N6p0EDdiEDCyADIAZrIAcgBmtzIAhxQQhPBEAgBSADQX9zQQV0aiECIAMgBWoiBi0AACAGIA1BGXYiBjoAACADQXhqIAhxIAVqQQhqIAY6AABB/wFGDQIgBC0ABSEDIAQtAAQhBiAEIAIvAAQ7AAQgAi0AByENIAItAAYhDiACIAQvAAY7AAYgBCgAACERIAQgAigAADYAACACIBE2AAAgAiAGOgAEIAQgDjoABiACIAM6AAUgBCANOgAHIAQtAAghAyAEIAItAAg6AAggAiADOgAIIAQtAAkhAyAEIAItAAk6AAkgAiADOgAJIAQtAAohAyAEIAItAAo6AAogAiADOgAKIAQtAAshAyAEIAItAAs6AAsgAiADOgALIAQtAAwhAyAEIAItAAw6AAwgAiADOgAMIAQtAA0hAyAEIAItAA06AA0gAiADOgANIAQtAA4hAyAEIAItAA46AA4gAiADOgAOIAQtAA8hAyAEIAItAA86AA8gAiADOgAPIAQtABAhAyAEIAItABA6ABAgAiADOgAQIAQtABEhAyAEIAItABE6ABEgAiADOgARIAQtABIhAyAEIAItABI6ABIgAiADOgASIAQtABMhAyAEIAItABM6ABMgAiADOgATIAQtABQhAyAEIAItABQ6ABQgAiADOgAUIAQtABUhAyAEIAItABU6ABUgAiADOgAVIAQtABYhAyAEIAItABY6ABYgAiADOgAWIAQtABchAyAEIAItABc6ABcgAiADOgAXIAQtABghAyAEIAItABg6ABggAiADOgAYIAQtABkhAyAEIAItABk6ABkgAiADOgAZIAQtABohAyAEIAItABo6ABogAiADOgAaIAQtABshAyAEIAItABs6ABsgAiADOgAbIAQtABwhAyAEIAItABw6ABwgAiADOgAcIAQtAB0hAyAEIAItAB06AB0gAiADOgAdIAQtAB4hAyAEIAItAB46AB4gAiADOgAeIAQtAB8hAyAEIAItAB86AB8gAiADOgAfDAELCyAM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ACICKAIEIAIoAggiA0YEQCACIANBARDmASACKAIIIQMLIAIoAgAgA2pB+wA6AAAgAiADQQFqNgIIIAQgAUHjhsAAQQQQOCAELQAAQQRHBEAgBCAEKQMANwMIIARBCGoQ7gIMCQsgASgCACICKAIEIAIoAggiA0YEQCACIANBARDmASACKAIIIQMLIAIoAgAgA2pBOjoAACACIANBAWo2AgggBCABIABBBGooAgAgAEEMaigCABA4IAQtAABBBEcEQCAEIAQpAwA3AwggBEEIahDuAgwJCyABKAIAIgEoAgQgASgCCCIARgRAIAEgAEEBEOYBIAEoAgghAAsgASgCACAAakH9ADoAAAwHCyABKAIAIgIoAgQgAigCCCIDRgRAIAIgA0EBEOYBIAIoAgghAwsgAigCACADakH7ADoAACACIANBAWo2AgggBCABQdqGwABBCRA4IAQtAABBBEcNBCABKAIAIgIoAgQgAigCCCIDRgRAIAIgA0EBEOYBIAIoAgghAwsgAigCACADakE6OgAAIAIgA0EBajYCCCABKAIAIgIoAgQgAigCCCIDRgRAIAIgA0EBEOYBIAIoAgghAwsgAigCACADakHbADoAACACIANBAWo2AgggBCABIABBBGooAgAgAEEMaigCABA4IAQtAABBBEYNBSAEIAQpAwA3AwggBEEIahDuAgwHCyABKAIAIgIoAgQgAigCCCIDRgRAIAIgA0EBEOYBIAIoAgghAwsgAigCACADakH7ADoAACACIANBAWo2AgggBCABQdOGwABBBxA4IAQtAABBBEcNASABKAIAIgIoAgQgAigCCCIDRgRAIAIgA0EBEOYBIAIoAgghAwsgAigCACADakE6OgAAIAIgA0EBajYCCCABKAIAIgIoAgQgAigCCCIDRgRAIAIgA0EBEOYBIAIoAgghAwsgAigCACADakHbADoAACACIANBAWo2AgggBCABIABBBGooAgAgAEEMaigCABA4IAQtAABBBEYNAiAEIAQpAwA3AwggBEEIahDuAgwGCyABKAIAIgIoAgQgAigCCCIDRgRAIAIgA0EBEOYBIAIoAgghAwsgAigCACADakH7ADoAACACIANBAWo2AgggBCABQdCGwABBAxA4AkAgBC0AAEEERgRAIAEoAgAiAigCBCACKAIIIgNGBEAgAiADQQEQ5gEgAigCCCEDCyACKAIAIANqQTo6AAAgAiADQQFqNgIIIAEoAgAiAigCBCACKAIIIgNGBEAgAiADQQEQ5gEgAigCCCEDCyACKAIAIANqQdsAOgAAIAIgA0EBajYCCCAEIAEgAEEEaigCACAAQQxqKAIAEDggBC0AAEEERg0BIAQgBCkDADcDCCAEQQhqEO4CDAcLIAQgBCkDADcDCCAEQQhqEO4CDAYLIAEoAgAiAigCBCACKAIIIgNGBEAgAiADQQEQ5gEgAigCCCEDCyACKAIAIANqQSw6AAAgAiADQQFqNgIIIAQgASAAQRBqKAIAIABBGGooAgAQOCAELQAAQQRHBEAgBCAEKQMANwMIIARBCGoQ7gIMBgsgASgCACIBKAIEIAEoAggiAEYEQCABIABBARDmASABKAIIIQALIAEoAgAgAGpB3QA6AAAgASAAQQFqIgA2AgggACABKAIERgRAIAEgAEEBEOYBIAEoAgghAAsgASgCACAAakH9ADoAAAwECyAEIAQpAwA3AwggBEEIahDuAgwECyABKAIAIgIoAgQgAigCCCIDRgRAIAIgA0EBEOYBIAIoAgghAwsgAigCACADakEsOgAAIAIgA0EBajYCCCAEIAEgAEEQaigCACAAQRhqKAIAEDggBC0AAEEERwRAIAQgBCkDADcDCCAEQQhqEO4CDAQLIAEoAgAiASgCBCABKAIIIgBGBEAgASAAQQEQ5gEgASgCCCEACyABKAIAIABqQd0AOgAAIAEgAEEBaiIANgIIIAAgASgCBEYEQCABIABBARDmASABKAIIIQALIAEoAgAgAGpB/QA6AAAMAgsgBCAEKQMANwMIIARBCGoQ7gIMAgsgASgCACICKAIEIAIoAggiA0YEQCACIANBARDmASACKAIIIQMLIAIoAgAgA2pBLDoAACACIANBAWo2AgggBCABIABBEGooAgAgAEEYaigCABA4IAQtAABBBEcEQCAEIAQpAwA3AwggBEEIahDuAgwCCyABKAIAIgEoAgQgASgCCCIARgRAIAEgAEEBEOYBIAEoAgghAAsgASgCACAAakHdADoAACABIABBAWoiADYCCCAAIAEoAgRGBEAgASAAQQEQ5gEgASgCCCEACyABKAIAIABqQf0AOgAACyABIABBAWo2AghBAAsgBEEQaiQAC4sOAgl/BH4jAEFAaiIC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QQNxIQIDQEEAIAFBAWogBC0AAEEKRiIAGyEBIARBAWohBCAAIANqIQMgAkF/aiICDQALCyAHQQs2AgAgByADIAEQ3QIMAQsgASAFRw0BAkAgBUUEQEEBIQNBACECDAELIAAoAgAhASAFQQNxIQYCQCAFQX9qQQNJBEBBACECQQEhAwwBCyAFQXxxIQVBASEDQQAhAgNAQQBBAUECQQMgAkEEaiABLQAAQQpGIgkbIAEtAAFBCkYiChsgAS0AAkEKRiIIGyABLQADQQpGIgAbIQIgAyAJaiAKaiAIaiAAaiEDIAFBBGohASAFQXxqIgUNAAsLIAZFDQADQEEAIAJBAWogAS0AAEEKRiIAGyECIAFBAWohASAAIANqIQMgBkF/aiIGDQALCyAHQQQ2AgAgByADIAIQ3QILIAdBEGokAA8LIAEgBUGkyMAAEKACAAvjCQELfyMAQdABayICJAAgAkEBOwHEASACQS82AsABIAJCr4CAgBA3A7gBIAJBADYCsAEgAkEANgKgASACIABB6ABqKAIAIgM2ArQBIAIgAzYCrAEgAiAAQeAAaigCADYCqAEgAiADNgKkASADBEAgAkFAayACQaABahBNCyACQegAaiACQcABaikDADcDACACQeAAaiACQbgBaikDADcDACACQdgAaiACQbABaikDADcDACACQdAAaiACQagBaikDADcDACACIAIpA6ABNwNIQX8hAwNAIANBAWohAyACQThqIAJByABqEE0gAigCOA0ACyACQQE7AcQBIAJBLzYCwAEgAkKvgICAEDcDuAEgAkEANgKwASACQQA2AqABIAIgAUEIaigCACIENgK0ASACIAQ2AqwBIAIgASgCADYCqAEgAiAENgKkASAEBEAgAkEwaiACQaABahBNCyACQegAaiIBIAJBwAFqKQMANwMAIAJB4ABqIgQgAkG4AWopAwA3AwAgAkHYAGoiBSACQbABaikDADcDACACQdAAaiACQagBaikDADcDACACIAIpA6ABNwNIIAIgAzYCcAJAAkAgAwRAIANBAUcEQCADQX9qIQMDQCACQShqIAJByABqEE0gAigCKEUNAyADQX9qIgMNAAsLIAJBIGogAkHIAGoQTSACKAIgRQ0BCyACQZgBaiABKQMANwMAIAJBkAFqIAQpAwA3AwAgAkGIAWogBSkDADcDACACQYABaiACQdAAaikDADcDACACIAIpA0g3A3ggAkEYaiACQfgAahBNIAIoAhgiC0UNACACKAIcIQgDQAJAIABB+ABqKAIAIgEEQCAAQfAAaigCACIGIAFBAnRqIQwDQCAGKAIAIgBB6ABqKAIAIQdBACEDAkAgAEHwAGooAgAiBEUEQEEAIQlBACEKDAELIAchBSAEIQADQAJ/IABBCE8EQCACQRBqQS8gBSAAEKcBIAIoAhAhASACKAIUDAELIABFBEBBACEBQQAMAQtBASEBQQAgBS0AAEEvRg0AGgJAIABBAUYNAEEBIAUtAAFBL0YNARogAEECRg0AQQIgBS0AAkEvRg0BGiAAQQNGDQBBAyAFLQADQS9GDQEaIABBBEYNAEEEIAUtAARBL0YNARogAEEFRg0AQQUgBS0ABUEvRg0BGiAAQQZGDQBBBiAAIAUtAAZBL0YiARsMAQtBACEBIAALIQVBASEJQQAhCiABQQFHBEAgBCEDDAILAkAgAyAFaiIAQQFqIgNFIAQgA0lyDQAgACAHai0AAEEvRw0AQQAhCSADIQoMAgsgBCADayEAIAMgB2ohBSAEIANPDQALCyACIAk6AMUBIAJBAToAxAEgAkEvNgLAASACQq+AgIAQNwO4ASACIAQ2ArQBIAIgAzYCsAEgAiAENgKsASACIAc2AqgBIAIgBDYCpAEgAiAKNgKgASACIAIvAcwBOwHGASACQQhqIAJBoAFqEFsgAigCCCIARQ0FIAggAigCDEYEQCAAIAsgCBDbA0UNAwsgBkEEaiIGIAxHDQALC0HsmsAAQRRBgJvAABC+AwALIAYoAgBBCGohACACIAJB+ABqEE0gAigCBCEIIAIoAgAiCw0ACwsgAkHQAWokACAADwtB/JnAAEErQcCawAAQ2AIAC6IJAQd/AkAgAUH/CU0EQCABQQV2IQUCQAJAAkAgACgCACIEBEAgACAEQQJ0aiECIAAgBCAFakECdGohBiAEQX9qIgNBJ0shBANAIAQNBCADIAVqIgdBKE8NAiAGIAIoAgA2AgAgBkF8aiEGIAJBfGohAiADQX9qIgNBf0cNAAsLIAFBIEkNBCAAQQA2AgQgAUHAAE8NAQwECyAHQShB2KvBABCgAgALIABBCGpBADYCACAFQQEgBUEBSxsiAkECRg0CIABBDGpBADYCACACQQNGDQIgAEEQakEANgIAIAJBBEYNAiAAQRRqQQA2AgAgAkEFRg0CIABBGGpBADYCACACQQZGDQIgAEEcakEANgIAIAJBB0YNAiAAQSBqQQA2AgAgAkEIRg0CIABBJGpBADYCACACQQlGDQIgAEEoakEANgIAIAJBCkYNAiAAQSxqQQA2AgAgAkELRg0CIABBMGpBADYCACACQQxGDQIgAEE0akEANgIAIAJBDUYNAiAAQThqQQA2AgAgAkEORg0CIABBPGpBADYCACACQQ9GDQIgAEFAa0EANgIAIAJBEEYNAiAAQcQAakEANgIAIAJBEUYNAiAAQcgAakEANgIAIAJBEkYNAiAAQcwAakEANgIAIAJBE0YNAiAAQdAAakEANgIAIAJBFEYNAiAAQdQAakEANgIAIAJBFUYNAiAAQdgAakEANgIAIAJBFkYNAiAAQdwAakEANgIAIAJBF0YNAiAAQeAAakEANgIAIAJBGEYNAiAAQeQAakEANgIAIAJBGUYNAiAAQegAakEANgIAIAJBGkYNAiAAQewAakEANgIAIAJBG0YNAiAAQfAAakEANgIAIAJBHEYNAiAAQfQAakEANgIAIAJBHUYNAiAAQfgAakEANgIAIAJBHkYNAiAAQfwAakEANgIAIAJBH0YNAiAAQYABakEANgIAIAJBIEYNAiAAQYQBakEANgIAIAJBIUYNAiAAQYgBakEANgIAIAJBIkYNAiAAQYwBakEANgIAIAJBI0YNAiAAQZABakEANgIAIAJBJEYNAiAAQZQBakEANgIAIAJBJUYNAiAAQZgBakEANgIAIAJBJkYNAiAAQZwBakEANgIAIAJBJ0YNAiAAQaABakEANgIAIAJBKEYNAkEoQShB2KvBABCgAgALIANBKEHYq8EAEKACAAtBgqzBAEEdQdirwQAQ2AIACyAAKAIAIAVqIQIgAUEfcSIHRQRAIAAgAjYCACAADwsCQCACQX9qIgNBJ00EQCACIQQgACADQQJ0akEEaigCACIGQQAgAWsiAXYiA0UNASACQSdNBEAgACACQQJ0akEEaiADNgIAIAJBAWohBAwCCyACQShB2KvBABCgAgALIANBKEHYq8EAEKACAAsCQCAFQQFqIgggAkkEQCABQR9xIQEgAkECdCAAakF8aiEDA0AgAkF+akEoTw0CIANBBGogBiAHdCADKAIAIgYg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oAFqKAIAIgNFDQAgAkG4AWogAyACKAKkASgCEBEBAAsgAUEBaiIBQX8gARsiAUEEIAFBBEsbIgVB/////wBLDQIgBUEDdCIGQQBIDQIgBUGAgICAAUlBAnQhASAGBH8gBiABEKsDBSABCyIDRQ0BIAMgBDYCBCADIAc2AgAgAkEBNgKwASACIAU2AqwBIAIgAzYCqAEgAkG4AWogAkEgakGIARDaAxogAkEQaiACQbgBahAkIAIoAhAiBgRAIAIoAhQhB0EMIQVBASEBA0AgAigCrAEgAUYEQCACKQPgASEJAkAgAigCwAFFBEBBACEDIAlQDQFBfyACKAKAAkEAIAIoAvABGyIDIAIoAqgCQQAgAigCmAIbaiIEIAQgA0kbIQMgAigCuAIiBEUNASACQcACaiAEIAIoArwCKAIQEQEADAELIAIoAtABIQMgCVANAEF/IAIoAoACQQAgAigC8AEbIgQgAigCqAJBACACKAKYAhtqIgggCCAESRshBAJAIAIoArgCIghFDQAgAkHAAmogCCACKAK8AigCEBEBAAJAIAIoAsACDQAgAigCxAJBAUcNACACKALIAkUNAQtBfyADIARqIgQgBCADSRshAwwBC0F/IAMgBGoiBCAEIANJGyEDCyACQagBaiABIANBAWoiA0F/IAMbEN0BIAIoAqgBIQMLIAMgBWoiBCAHNgIAIARBfGogBjYCACACIAFBAWoiATYCsAEgBUEIaiEFIAJBCGogAkG4AWoQJCACKAIMIQcgAigCCCIGDQALCwJAIAIpA+ABUA0AIAJBuAJqKAIAIgFFDQAgASACKAK8AiIDKAIAEQMAIANBBGooAgBFDQAgA0EIaigCABogARAdCyAAIAIpA6gBNwIAIABBCGogAkGwAWooAgA2AgALIAJB0AJqJAAPCyAGIAEQ1QMACxDlAgAL3wgCB38BfiMAQdACayICJAAgAkEgaiABQYgBENoDGiACQRhqIAJBIGoQJgJAAkACQCACKAIYIgdFBEAgAEEANgIIIABCBDcCACACKQNIUA0BIAJBoAFqKAIAIgBFDQEgACACKAKkASIBKAIAEQMAIAFBBGooAgBFDQEgAUEIaigCABogABAdDAELIAIoAhwhBCACKQNIIQkCQAJAIAIoAihFBEAgCVBFDQFBACEBDAILIAIoAjghASAJUA0BQX8g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DQcgASACaiAOQgp+Ig4gDYinQTBqOgAAIBBCCn4hECAOIBGDIQ4gCSABQQFqIgFHDQALIAAgAiADIAkgByAEIA4gDyAQEH4PC0Gf/cAAQRxB+I7BABDYAgALQYiPwQBBJEGsj8EAENgCAAsgAUHRAEGYjMEAEKACAAtBrI7BAEEhQbyPwQAQ2AIACyADIANB3I/BABCgAgALIAAgAiADIAkgByAEIAWtIA2GIA58IAatIA2GIA8Qfg8LIAEgA0Hsj8EAEKACAAvKCAEEfyMAQbAEayICJAAgAkEQaiAAKAIAEAEgAkEYaiACKAIQIgAgAigCFCIEEIMBIAQEQCAAEB0LIAJBIzYChAEgAiACQfABajYCgAEgAiACQRhqNgLwASACQQE2AsQDIAJCATcCtAMgAkGoj8AANgKwAyACIAJBgAFqNgLAAyACQYgCaiACQbADahBeIAIoAogCIgAgAigCkAIQAiACKAKMAgRAIAAQHQsgAigCGCEAAkAgAi0AcCIEQQNHBEAgAkGAAWogAkEYakEEckHUABDaAxogAiACQfQAaigAADYAeyACIAIoAHE2AnggAkEIaiABKAIAEAEgAkHYAWogAigCCCIBIAIoAgwiAxBwIAMEQCABEB0LIAJBJDYC9AEgAiACQZgDajYC8AEgAiACQdgBajYCmAMgAkEBNgLEAyACQgE3ArQDIAJBuJDAADYCsAMgAiACQfABajYCwAMgAkGIAmogAkGwA2oQXiACKAKIAiIBIAIoApACEAIgAigCjAIEQCABEB0LIAIoAtwBIQEgAigC2AEiA0UNASACQYACaiACQegBaikDADcDACACIAE2AvQBIAIgAzYC8AEgAiACKQPgATcD+AEgAiAANgKwAyACQbADakEEciACQYABakHUABDaAxogAkGMBGogAigAezYAACACIAQ6AIgEIAIgAigCeDYAiQQgAkGIAmogAkGwA2oQKiACQaQDakElNgIAIAJBJjYCnAMgAiACQYgCajYCqAMgAiACQawDajYCoAMgAiACQagDajYCmAMgAiACQfABajYCrAMgAkECNgLEAyACQgI3ArQDIAJB4JDAADYCsAMgAiACQZgDajYCwAMgAkGIA2ogAkGwA2oQXiACKAKIAyIAIAIoApADEAIgAigCjAMEQCAAEB0LIAJBsANqIAJBiAJqQYABENoDGiACQZgDaiACQbADaiACQfABahCwASACQbADaiACQZgDahD5ASACKAKwA0UEQCACKAK0AyACKAKgAyIABEAgAEEFdCEBIAIoApgDQRBqIQADQCAAEJQBIABBIGohACABQWBqIgENAAsLIAIoApwDBEAgAigCmAMQHQsgAigC+AEiAQRAIAIoAvABIQAgAUEYbCEBA0ACQCAALQAAIgNBfGpB/wFxIgVBA01BACAFQQFHGw0AAkAgA0EDcUEBaw4CAQEACyAAQQRqIgNBBGooAgBFDQAgAygCABAdCyAAQRhqIQAgAUFoaiIBDQALCyACKAL0AQRAIAIoAvABEB0LIAJBgAJqKAIABEAgAigC/AEQHQsgAkGwBGokAA8LIAIgAigCtAM2AogDQbCPwABBKyACQYgDakHcj8AAQfCQwAAQkgIACyACIAA2ArADQbCPwABBKyACQbADakHcj8AAQYiQwAAQkgIACyACIAE2ArADQbCPwABBKyACQbADakHcj8AAQcCQwAAQkgIAC8oIAgZ/A34jAEFAaiIEJAAgBCACNgIEIARBPGoiBkEBNgIAIARCAjcCLCAEQbSvwAA2AiggBEHTADYCDCAEIARBCGo2AjggBCAEQQRqNgIIIARBKGoQOgJAAkACQAJAAkACQCAEKAIEIgIoAgAOAwAEAgELIAMtAAANAgsgBEEcakEBNgIAIAZBADYCACAEQgE3AgwgBEHksMAANgIIIARB4gA2AiQgBEH0rcAANgI4IARCATcCLCAEQaCxwAA2AiggBCAEQSBqNgIYIAQgBEEoajYCICAEQQhqQaixwAAQ5gIACyADLQAARQRAIABBBGogAkEQahCzAiAAQQA6AAAMAwsCQCABIAJBBGoQGSIBQTxqKAIARQ0AIAFBIGogAkEQaiIFEGUiCkIZiEL/AINCgYKEiJCgwIABfiEMIAqnIQMgAUE0aigCACIHQXBqIQggAkEYaigCACEGIAUoAgAhCSABQTBqKAIAIQFBACECA0ACQCAHIAEgA3EiA2opAAAiCyAMhSIKQn+FIApC//379+/fv/9+fINCgIGChIiQoMCAf4MiClANAANAAkAgCCAKeqdBA3YgA2ogAXFBBHRrIgVBCGooAgAgBkYEQCAJIAUoAgAgBhDbA0UNAQsgCkJ/fCAKgyIKUEUNAQwCCwsCQAJA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dEHwAXFrQXBqIQIgASgCACEFCyAAIAI2AgQgACAFNgIADwsAC+QIAQF/IwBBMGsiAiQAAn8CQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgAC0AAEEBaw4RAQIDBAUGBwgJCgsMDQ4PEBEACyACIAAtAAE6AAggAkEsakEBNgIAIAJCAjcCHCACQaTcwAA2AhggAkGQATYCFCACIAJBEGo2AiggAiACQQhqNgIQIAEgAkEYahCiAgwRCyACIAApAwg3AwggAkEsakEBNgIAIAJCAjcCHCACQYjcwAA2AhggAkGRATYCFCACIAJBEGo2AiggAiACQQhqNgIQIAEgAkEYahCiAgwQCyACIAApAwg3AwggAkEsakEBNgIAIAJCAjcCHCACQYjcwAA2AhggAkGSATYCFCACIAJBEGo2AiggAiACQQhqNgIQIAEgAkEYahCiAgwPCyACIAArAwg5AwggAkEsakEBNgIAIAJCAjcCHCACQezbwAA2AhggAkGTATYCFCACIAJBEGo2AiggAiACQQhqNgIQIAEgAkEYahCiAgwOCyACIAAoAgQ2AgggAkEsakEBNgIAIAJCAjcCHCACQczbwAA2AhggAkGUATYCFCACIAJBEGo2AiggAiACQQhqNgIQIAEgAkEYahCiAgwNCyACIAApAgQ3AwggAkEsakEBNgIAIAJCATcCHCACQbjbwAA2AhggAkGVATYCFCACIAJBEGo2AiggAiACQQhqNgIQIAEgAkEYahCiAgwMCyACQSxqQQA2AgAgAkHY2cAANgIoIAJCATcCHCACQajbwAA2AhggASACQRhqEKICDAsLIAJBLGpBADYCACACQdjZwAA2AiggAkIBNwIcIAJBlNvAADYCGCABIAJBGGoQogIMCgsgAkEsakEANgIAIAJB2NnAADYCKCACQgE3AhwgAkGA28AANgIYIAEgAkEYahCiAgwJCyACQSxqQQA2AgAgAkHY2cAANgIoIAJCATcCHCACQezawAA2AhggASACQRhqEKICDAgLIAJBLGpBADYCACACQdjZwAA2AiggAkIBNwIcIAJB1NrAADYCGCABIAJBGGoQogIMBwsgAkEsakEANgIAIAJB2NnAADYCKCACQgE3AhwgAkHE2sAANgIYIAEgAkEYahCiAgwGCyACQSxqQQA2AgAgAkHY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PEEDRw0BIAFBQGsoAgAiAigCACACKAIEKAIAEQMAIAIoAgQiA0EEaigCAARAIANBCGooAgAaIAIoAgAQHQsgAhAdDAELIAJBA0cNACABQUBrKAIAIgIoAgAgAigCBCgCABEDACACKAIEIgNBBGooAgAEQCADQQhqKAIAGiACKAIAEB0LIAEoAkAQHQsCQCAERQ0AQYS0wQAoAgBB/////wdxRQ0AEOgDDQAgAEEBOgAJCyAAQQA6AAhBrLTBACgCACECQay0wQAgADYCACACRQ0CIAIgAigCACIAQX9qNgIAIABBAUcNAiACENQCDAILIAFBADYCXCABQazfwAA2AlggAUIBNwJMIAFByPDAADYCSCABQThqIAFByABqEKcCAAtB0LPBACgCAEEDRwRAEM8CCyABQdSzwQA2AiwgASABQSxqNgI4IAFB2ABqIAFBEGopAwA3AwAgAUHQAGogAUEIaikDADcDACABIAEpAwA3A0ggAUEgaiABQThqIAFByABqEH8gAS0AIEEERg0AIAEgASkDIDcDMCABQdwAakECNgIAIAFBxABqQaABNgIAIAFCAjcCTCABQcTpwAA2AkggAUGfATYCPCABIAFBOGo2AlggASABQTBqNgJAIAEgAUEYajYCOCABQcgAakHU6cAAEOYCAAsgAUHgAGokAAvuBQIHfwJ+IwBBEGsiBiQAIAAoAgAhBCAALQAEQQFHBEAgBCgCACICKAIEIAIoAggiBUYEQCACIAVBARDmASACKAIIIQULIAIoAgAgBWpBLDoAACACIAVBAWo2AggLIABBAjoABCAGIARB54bAAEEHEDgCQCAGLQAAQQRHBEAgBiAGKQMANwMIIAZBCGoQ7gIhAAwBCyAEKAIAIgAoAgQgACgCCCIDRgRAIAAgA0EBEOYBIAAoAgghAwsgACgCACADakE6OgAAIAAgA0EBajYCCCABQRRqKAIAIgMpAwAgAUEcaigCACEHIAQoAgAiACgCBCAAKAIIIgFGBEAgACABQQEQ5gEgACgCCCEBCyAAKAIAIAFqQfsAOgAAIAAgAUEBaiIBNgIIIAdFBEAgASAAKAIERgRAIAAgAUEBEOYBIAAoAgghAQsgACgCACABakH9ADoAACAAIAFBAWo2AggLIANBCGohAUJ/hUKAgYKEiJCgwIB/gyEJIAdFIQUgB0EARyEC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cUEKSQ0ACyAAIAZBf2o2AgggCUEBcQ0GIAhBIHJB5QBHDQcgACAGNgIIIAYgA08NAiAFIAZqLQAAQVVqDgMBAgECCyAAIAM2AgggCUEBcUUNBgwFCyAAIAZBAWoiBjYCCAsgBiADTw0BIAAgBkEBaiIBNgIIIAUgBmotAABBUGpB/wFxQQlLDQEgASADTw0EA0AgASAFai0AAEFQakH/AXFBCUsNBSAAIAFBAWoiATYCCCABIANHDQALDAQLIAAgAUEBaiICNgIIAkAgAiADTw0AAkAgAiAFai0AAEFVag4DAAEAAQsgACABQQJqIgI2AggLIAIgA08NASAAIAJBAWoiATYCCCACIAVqLQAAQVBqQf8BcUEJSw0BIAEgA08NAwNAIAEgBWotAABBUGpB/wFxQQlLDQQgACABQQFqIgE2AgggASADRw0ACwwDCyAEQQw2AgAgACAEEMMCIQcMAgsgBEEMNgIAIAAgBBDDAiEHDAELIARBDDYCACAAIAQQwgIhBwsgBEEQaiQAIAcLpgUCB38FfiMAQdAAayIEJAAgAUEIaikDACELIAEpAwAhDCAEQRhqIgggAUEQahBOIAQgCzcDECAEIAw3AwggBCACNgIsIARBCGogBEEsahBzIQwgBEEcaigCACIJQWBqIQogDEIZiEL/AINCgYKEiJCgwIABfiEOIAynIQFBACECIAQoAiwhBSAEKAIYIQYCQANAIAkgASAGcSIHaikAACINIA6FIgtCf4UgC0L//fv379+//358g0KAgYKEiJCgwIB/gyELA0AgC1AEQCANIA1CAYaDQoCBgoSIkKDAgH+DUARAIAcgAkEIaiICaiEBDAMLIARBzABqIANBGGooAgA2AgAgBEHEAGogA0EQaikCADcCACAEQTxqIANBCGopAgA3AgAgBCAFNgIwIAQgAykCADcCNCAIIAwgBEEwaiAEQQhqEGwMAwsgC3ohDyALQn98IAuDIQsgCiAPp0EDdiAHaiAGcUEFdGsiASgCACAFRw0ACwsgASkCBCELIAEgAykCADcCBCAEQcgAaiABQRxqIgUoAgA2AgAgBEFAayABQRRqIgYpAgA3AwAgBEE4aiICIAFBDGoiASkCADcDACABIANBCGopAgA3AgAgBiADQRBqKQIANwIAIAUgA0EYaigCADYCACAEIAs3AzACfwJAAkAC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LQAYQQFqOgAYIAEoAggiAyABKAIEIgZJBEAgASgCACEHA0AgAyAHai0AACIIQXdqIglBF0tBASAJdEGTgIAEcUVyDQQgASADQQFqIgM2AgggAyAGRw0ACwsgAkEDNgIAIAAgASACEMMCNgIEDAULIAIoAgQhAwsgACADNgIEDAILIAhB/QBGBEAgACAFOgABIAEgA0EBajYCCEEAIQQMAwsgAkEKNgIAIAAgASACEMMCNgIEDAELIAJBFTYCACAAIAEgAhDCAjYCBAtBASEECyAAIAQ6AAAgAkEQaiQAC4EEAQh/IwBBEGsiAiQAAkACQAJAAkAgASgCCCIDIAEoAgQiBUkEQCABKAIAIQYDQCADIAZqLQAAIgdBd2oiBEEZSw0DQQEgBHRBk4CABHFFBEAgBEEZRw0EIAIgARCpASACLQAARQ0DIAAgAigCBDYCBAwFCyABIANBAWoiAzYCCCADIAVHDQALCyACQQU2AgAgACABIAIQwgI2AgQMAgsgACACLQABOgABQQAhBAwCCyAHQfsARwRAIAJBCjYCACAAIAEgAhDCAjYCBAwBCyABIAEtABhBf2oiBDoAGCAEQf8BcQRAIAEgA0EBajYCCCACIAEQqQECQAJAIAItAABFBEAgAi0AASEFIAEQiwIiAw0BIAEQnAEiAw0BQQEhBCABIAEtABhBAWo6ABggASgCCCIDIAEoAgQiBkkEQCABKAIAIQcDQCADIAdqLQAAIghBd2oiCUEXS0EBIAl0QZOAgARxRXINBCABIANBAWoiAzYCCCADIAZHDQALCyACQQM2AgAgACABIAIQwwI2AgQMBQsgAigCBCEDCyAAIAM2AgQMAgsgCEH9AEYEQCAAIAU6AAEgASADQQFqNgIIQQAhBAwDCyACQQo2AgAgACABIAIQwwI2AgQMAQsgAkEVNgIAIAAgASACEMICNgIEC0EBIQQLIAAgBDoAACACQRBqJAAL2wMBB38jAEEwayIDJAAgACgCACICKAIEIAIoAggiAEYEQCACIABBARDmASACKAIIIQALIAIoAgAgAGpBIjoAACACIABBAWoiBTYCCEEKIQACQCABQZDOAEkEQCABIQQMAQsDQCADQQhqIABqIgZBfGogASABQZDOAG4iBEGQzgBsayIHQf//A3FB5ABuIghBAXRB7obAAGovAAA7AAAgBkF+aiAHIAhB5ABsa0H//wNxQQF0Qe6GwABqLwAAOwAAIABBfGohACABQf/B1y9LIAQhAQ0ACwsCQCAEQeMATQRAIAQhAQwBCyAAQX5qIgAgA0EIamogBCAEQf//A3FB5ABuIgFB5ABsa0H//wNxQQF0Qe6GwABqLwAAOwAACwJAIAFBCk8EQCAAQX5qIgAgA0EIamogAUEBdEHuhsAAai8AADsAAAwBCyAAQX9qIgAgA0EIamogAUEwajoAAAsgAigCBCAFa0EKIABrIgFJBEAgAiAFIAEQ5gEgAigCCCEFCyACKAIAIAVqIANBCGogAGogARDaAxogAiABIAVqIgE2AgggASACKAIERgRAIAIgAUEBEOYBIAIoAgghAQsgAigCACABakEiOgAAIAIgAUEBajYCCCADQTBqJAAL1AMCAn8GfiMAQdAAayICJAAgAkFAayIDQgA3AwAgAkIANwM4IAIgACkDACIENwMIIAIgBELh5JXz1uzZvOwAhTcDICACIARC9crNg9es27fzAIU3AxggAiAAQQhqKQMAIgQ3AxAgAiAEQvPK0cunjNmy9ACFNwMwIAIgBELt3pHzlszct+QAhTcDKCACQQhqIAEoAgAgAUEIaigCABBDIAJB/wE6AE8gAkEIaiACQc8AakEBEEMgAzUCACEFIAIpAzghBiACKQMwIAIpAyAhCCACKQMYIQkgAikDKCEEIAJB0ABqJAAgBiAFQjiGhCIFhSIGQhCJIAYgCHwiBoUiByAEIAl8IghCIIl8IgkgBYUgBiAEQg2JIAiFIgR8IgUgBEIRiYUiBHwiBiAEQg2JhSIEIAdCFYkgCYUiByAFQiCJQv8BhXwiBXwiCCAEQhGJhSIEQg2JIAQgB0IQiSAFhSIFIAZCIIl8IgZ8IgSFIgdCEYkgByAFQhWJIAaFIgUgCEIgiXwiBnwiB4UiCEINiSAIIAVCEIkgBoUiBSAEQiCJfCIEfIUiBiAFQhWJIASFIgQgB0IgiXwiBXwiByAEQhCJIAWFQhWJhSAGQhGJhSAHQiCJhQvAAwIMfwF+IwBBMGsiAyQAAkACQAJAAn8gASgCACIHRQRAQaCfwAAhCkEADAELIAdBAWoiAkH/////AHEgAkcNASACQQR0IgQgB0EJaiIFaiICIARJDQECQAJAIAJBAE4EQCACDQFBCCEGDAILENACAAsgAkEIEKsDIgZFDQQLIAQgBmoiCiABKAIEIgQgBRDaAyECIAEoAgwiBQRAIAJBcGohDCAEQQhqIQsgBCkDAEJ/hUKAgYKEiJCgwIB/gyEOIAUhBiAEIQgDQCAOUARAIAshAgNAIAhBgH9qIQggAikDACACQQhqIgshAkJ/hUKAgYKEiJCgwIB/gyIOUA0ACwsgA0EgaiAIIA56p0EBdEHwAXFrIglBcGoiAhCzAiACKAIMIgJBf0cEQCACIAIoAgRBAWoiDTYCBCANRQ0FCyAOQn98IA6DIQ4gDEEAIAQgCWtBBHVrQQR0aiIJIAMpAyA3AgAgAyACNgIsIAlBCGogA0EoaikDADcCACAGQX9qIgYNAAsLIAEoAggLIQIgACAFNgIMIAAgAjYCCCAAIAo2AgQgACAHNgIAIANBMGokAA8LENACAAsACyACEJADAAvIAwEMfyMAQeAAayICJAACQCABKAIIIgMgASgCDCIHRgRAQQQhAwwBCyABQRxqKAIAIQggAUEYaigCACEJIAFBFGooAgAhCiABKAIQIQsgAkEwaiEFIAJBIGpBBHIhBAJAA0AgASADQQhqIgw2AgggAygCACIGRQRAQQQhAwwDCyADKAIEIQMgAiAGNgIcIAJBQGsgBkHoAGoQswIgAkHQAGogAxCzAiAEQQhqIgYgAkHIAGooAgA2AgAgBCACKQNANwIAIAUgAikDUDcCACAFQQhqIAJB2ABqKAIANgIAIAJBATYCICALIAogCSgCAEEIaiAIIAJBIGoQEyENIAIoAiAhAwJAIA1FBEACfyAEIANFDQAaIAUgAigCKEUNABogAigCJBAdIAULIgNBBGooAgAEQCADKAIAEB0LIAJBHGoQ2gEMAQsgAkEQaiAEQRBqKQIANwMAIAJBCGogBikCADcDACACIAQpAgA3AwAgAkEcahDaASADQQRHDQILIAwiAyAHRw0AC0EEIQMMAQsgACACKQMANwIEIABBFGogAkEQaikDADcCACAAQQxqIAJBCGopAwA3AgALIAAgAzYCACACQeAAaiQAC8gDAQx/IwBB4ABrIgIkAAJAIAEoAggiAyABKAIMIgdGBEBBBCEDDAELIAFBHGooAgAhCCABQRhqKAIAIQkgAUEUaigCACEKIAEoAhAhCyACQTBqIQUgAkEgakEEciEEAkADQCABIANBCGoiDDYCCCADKAIAIgZFBEBBBCEDDAMLIAMoAgQhAyACIAY2AhwgAkFAayAGQegAahCzAiACQdAAaiADELMCIARBCGoiBiACQcgAaigCADYCACAEIAIpA0A3AgAgBSACKQNQNwIAIAVBCGogAkHYAGooAgA2AgAgAkECNgIgIAsgCiAJKAIAQQhqIAggAkEgahATIQ0gAigCICEDAkAgDUUEQAJ/IAQgA0UNABogBSACKAIoRQ0AGiACKAIkEB0gBQsiA0EEaigCAARAIAMoAgAQHQsgAkEcahDaAQwBCyACQRBqIARBEGopAgA3AwAgAkEIaiAGKQIANwMAIAIgBCkCADcDACACQRxqENoBIANBBEcNAgsgDCIDIAdHDQALQQQhAwwBCyAAIAIpAwA3AgQgAEEUaiACQRBqKQMANwIAIABBDGogAkEIaikDADcCAAsgACADNgIAIAJB4ABqJAAL0gMBBX8gAEEEaigCACIFIAAoAgAiByABpyIIcSIGaikAAEKAgYKEiJCgwIB/gyIBUARAQQghBANAIAQgBmohBiAEQQhqIQQgBSAGIAdxIgZqKQAAQoCBgoSIkKDAgH+DIgFQDQALCwJAIAAoAgggBSABeqdBA3YgBmogB3EiBGosAAAiBkF/SgR/IAUgBSkDAEKAgYKEiJCgwIB/g3qnQQN2IgRqLQAABSAGC0EBcSIGRXINACAAQQEgAxASIABBBGooAgAiBSAAKAIAIgcgCHEiA2opAABCgIGChIiQoMCAf4MiAVAEQEEIIQQDQCADIARqIQMgBEEIaiEEIAUgAyAHcSIDaikAAEKAgYKEiJCgwIB/gyIBUA0ACwsgBSABeqdBA3YgA2ogB3EiBGosAABBf0wNACAFKQMAQoCBgoSIkKDAgH+DeqdBA3YhBAsgBCAFaiAIQRl2IgM6AAAgBEF4aiAHcSAFakEIaiADOgAAIAAgACgCCCAGazYCCCAAIAAoAgxBAWo2AgwgBUEAIARrQRxsakFkaiIAQRhqIAJBGGooAgA2AgAgAEEQaiACQRBqKQIANwIAIABBCGogAkEIaikCADcCACAAIAIpAgA3AgALmgQBBX8jAEEgayIAJAACQAJAAkACQAJAENUBIgEEQCABQRhqIgJBACACKAIAIgIgAkECRiICGzYCACACRQRAIAFBHGoiAi0AACEDIAJBAToAACAAIANBAXEiAzoABCADDQJBACEDQYS0wQAoAgBB/////wdxBEAQ6ANBAXMhAwsgAS0AHQ0DIAEgASgCGCIEQQEgBBs2AhggBEUNBiAEQQJHDQQgASgCGCEEIAFBADYCGCAAIAQ2AgQgBEECRw0FAkAgAw0AQYS0wQAoAgBB/////wdxRQ0AEOgDDQAgAUEBOgAdCyACQQA6AAALIAEgASgCACICQX9qNgIAIAJBAUYEQCABEMECCyAAQSBqJAAPC0HG4MAAQd4AQcThwAAQvgMACyAAQQA2AhwgAEGs38AANgIYIABCATcCDCAAQcjwwAA2AgggAEEEaiAAQQhqEKcCAAsgACADOgAMIAAgAjYCCEG43sAAQSsgAEEIakGY8cAAQdzxwAAQkgIACyAAQRxqQQA2AgAgAEGs38AANgIYIABCATcCDCAAQYTywAA2AgggAEEIakGM8sAAEOYCAAsgAEEANgIcIABBrN/AADYCGCAAQgE3AgwgAEG88sAANgIIIABBBGogAEEIakHE8sAAEKgCAAsgAEEcakEANgIAIABBrN/AADYCGCAAQgE3AgwgAEHU78AANgIIIABBCGpBlPDAABDmAgALpwMCDH8BfiMAQSBrIgckAAJAAkACQAJ/IAEoAgAiCUUEQEGgn8AAIQtBAAwBCyAJQQFqIgJB/////wNxIAJHDQEgAkECdCIEQQdqIgIgBEkNASACQXhxIgQgCUEJaiICaiIDIARJDQECQAJAIANBAE4EQCADDQFBCCEGDAILENACAAsgA0EIEKsDIgZFDQQLIAQgBmoiCyABKAIEIgggAhDaAyECIAEoAgwiAwRAIAJBfGohDCAIQQhqIQIgCCkDAEJ/hUKAgYKEiJCgwIB/gyEOIAMhBiAIIQQDQCAOUARAIAIhBQNAIARBYGohBCAFKQMAIAVBCGoiAiEFQn+FQoCBgoSIkKDAgH+DIg5QDQALCyAEIA56p0EBdkE8cWsiDUF8aigCACIKQX9HBEAgCiAKKAIEQQFqIgU2AgQgBUUNBQsgDkJ/fCAOgyEOIAxBACAIIA1rQQJ1a0ECdGogCjYCACAGQX9qIgYNAAsLIAEoAggLIQUgACADNgIMIAAgBTYCCCAAIAs2AgQgACAJNgIAIAdBIGokAA8LENACAAsACyADEJADAAvNAwEFfyAAQQRqKAIAIgUgACgCACIHIAGnIghxIgZqKQAAQoCBgoSIkKDAgH+DIgFQBEBBCCEEA0AgBCAGaiEGIARBCGohBCAFIAYgB3EiBmopAABCgIGChIiQoMCAf4MiAVANAAsLAkAgACgCCCAFIAF6p0EDdiAGaiAHcSIEaiwAACIGQX9KBH8gBSAFKQMAQoCBgoSIkKDAgH+DeqdBA3YiBGotAAAFIAYLQQFxIgZFcg0AIAAgAxAMIABBBGooAgAiBSAAKAIAIgcgCHEiA2opAABCgIGChIiQoMCAf4MiAVAEQEEIIQQDQCADIARqIQMgBEEIaiEEIAUgAyAHcSIDaikAAEKAgYKEiJCgwIB/gyIBUA0ACwsgBSABeqdBA3YgA2ogB3EiBGosAABBf0wNACAFKQMAQoCBgoSIkKDAgH+DeqdBA3YhBAsgBCAFaiAIQRl2IgM6AAAgBEF4aiAHcSAFakEIaiADOgAAIAAgACgCCCAGazYCCCAAIAAoAgxBAWo2AgwgBSAEQQV0a0FgaiIAQRhqIAJBGGopAgA3AgAgAEEQaiACQRBqKQIANwIAIABBCGogAkEIaikCADcCACAAIAIpAgA3AgALvAMBBX8jAEGAAWsiBSQAAkACQAJAAkAgASgCACICQRBxRQRAIAJBIHENASAAQQEgARCjASECDAQLQYABIQIgBUGAAWohBAJAAkADQCACRQRAQQAhAgwDCyAEQX9qQTBB1wAgAKciA0EPcSIGQQpJGyAGajoAACAAQhBaBEAgBEF+aiIEQTBB1wAgA0H/AXEiA0GgAUkbIANBBHZqOgAAIAJBfmohAiAAQoACVCAAQgiIIQBFDQEMAgsLIAJBf2ohAgsgAkGBAU8NAgsgAUEBQayXwQBBAiACIAVqQYABIAJrEDchAgwDC0GAASECIAVBgAFqIQQCQAJAA0AgAkUEQEEAIQIMAwsgBEF/akEwQTcgAKciA0EPcSIGQQpJGyAGajoAACAAQhBaBEAgBEF+aiIEQTBBNyADQf8BcSIDQaABSRsgA0EEdmo6AAAgAkF+aiECIABCgAJUIABCCIghAEUNAQwCCwsgAkF/aiECCyACQYEBTw0CCyABQQFBrJfBAEECIAIgBWpBgAEgAmsQNyECDAILIAJBgAFBnJfBABC6AwALIAJBgAFBnJfBABC6AwALIAVBgAFqJAAgAguvAwEMfyMAQdAAayIDJAAgAyABIAIQSUEEIQQCQCADKAIADQAgASgCCCICIAEoAgwiB0YNACABQSBqKAIAIQggAUEcaigCACEJIAFBGGooAgAhCiADQTBqIQYgASgCFCELIANBIGpBBHIhBSABKAIQIQwCQANAIAEgAkEEaiINNgIIIAIoAgAiAkUEQEEEIQQMAwsgAigCACECAkAgDC0AAEUEQCACQYQBai0AAEUNAQsgA0FAayACQegAahCzAiAFQQhqIgIgA0HIAGooAgA2AgAgBSADKQNANwIAIANBADYCICALIAogCSgCAEEIaiAIIANBIGoQEyADKAIgIQRFBEACfyAFIARFDQAaIAYgAygCKEUNABogAygCJBAdIAYLIgJBBGooAgBFDQEgAigCABAdDAELIANBGGogBUEQaikCADcDACADQRBqIAIpAgA3AwAgAyAFKQIANwMIIARBBEcNAgsgDSICIAdHDQALQQQhBAwBCyAAIAMpAwg3AgQgAEEUaiADQRhqKQMANwIAIABBDGogA0EQaikDADcCAAsgACAENgIAIANB0ABqJAALnAMBC38jAEEwayIDJAAgA0EKNgIoIANCioCAgBA3AyAgAyACNgIcIANBADYCGCADIAI2AhQgAyABNgIQIAMgAjYCDCADQQA2AgggACgCBCEIIAAoAgAhCSAAKAIIIQoCfwNAAkAgBkUEQAJAIAQgAksNAANAIAEgBGohBgJ/IAIgBGsiBUEITwRAIANBCiAGIAUQpwEgAygCBCEAIAMoAgAMAQtBACEAQQAgBUUNABoDQEEBIAAgBmotAABBCkYNARogBSAAQQFqIgBHDQALIAUhAEEAC0EBRwRAIAIhBAwCCwJAIAAgBGoiAEEBaiIERSAEIAJLcg0AIAAgAWotAABBCkcNAEEAIQYgBCEFIAQhAAwECyAEIAJNDQALC0EBIQYgAiIAIAciBUcNAQtBAAwCCwJAIAotAAAEQCAJQciUwQBBBCAIKAIMEQIADQELIAEgB2ohCyAAIAdrIQwgCiAAIAdHBH8gCyAMakF/ai0AAEEKRgUgDQs6AAAgBSEHIAkgCyAMIAgoAgwRAgBFDQELC0EBCyADQTBqJAALlAMBBH8jAEHgAGsiAyQAIAMgASACEJ4DIANBGGogA0EIaigCADYCACADQSRqQQA2AgAgAyADKQMANwMQ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AGoQswIgBEEIaiINIAJByABqKAIANgIAIAQgAikDQDcCACACQQA2AiAgCiAJIAgoAgBBCGogByACQSBqEBMgAigCICEDRQRAAn8gBCADRQ0AGiAFIAIoAihFDQAaIAIoAiQQHSAFCyIDQQRqKAIARQ0BIAMoAgAQHQwBCyACQRhqIARBEGopAgA3AwAgAkEQaiANKQIANwMAIAIgBCkCADcDCCADQQRHDQILIAwiAyAGRw0AC0EEIQMMAQsgACACKQMINwIEIABBFGogAkEYaikDADcCACAAQQxqIAJBEGopAwA3AgALIAAgAzYCACACQdAAaiQAC4gEAgN/An4jAEEwayIDJAACQEEcQQQQqwMiBARAQQRBARCrAyIFRQ0BIAVB7sK1qwY2AAAgA0EraiACQQhqKAAANgAAIAMgAikAADcAIyAEIAMpACA3AA0gBEEUaiADQSdqKQAANwAAIARBADoADCAEQoSAgIDAADcCBCAEIAU2AgAgBEEcaiECAn5BkLTBACkDAFBFBEBBoLTBACkDACEGQZi0wQApAwAMAQsgA0EQahCvA0GQtMEAQgE3AwBBoLTBACADKQMYIgY3AwAgAykDEAshByAAQQA2AhAgACAGNwMIIAAgBzcDACAAQRhqQgA3AwAgAEEUakGwlsAANgIAQZi0wQAgB0IBfDcDACADIAI2AiwgAyAENgIoIANBATYCJCADIAQ2AiAgACADQSBqEHggAEHIAGogAUEIaigCADYCACAAIAEpAgA3AkACfkGQtMEAKQMAUEUEQEGgtMEAKQMAIQZBmLTBACkDAAwBCyADEK8DQZC0wQBCATcDAEGgtMEAIAMpAwgiBjcDACADKQMACyEHIABBADsBWCAAIAc3AyAgAEIINwJMIABBOGpCADcDACAAQTRqQbCWwAA2AgAgAEEwakEANgIAIABBKGogBjcDAEGYtMEAIAdCAXw3AwAgAEHUAGpBADYCACADQTBqJAAPC0EcQQQQ1QMAC0EEQQEQ1QMAC/UCAQl/IwBBMGsiAyQAIAEoAgQgASgCACEIIABBGGooAgAgASgCDCIFIAEoAggiAWsiBEEcbiICQQFqQQF2IAIgAEEcaigCABsiBkkEQCAAQRBqIAYgABASCwJAIAEgBUcEQCAEQWRqIQQgA0EgakEBciIGQQdqIQkDQCABIgItAAwi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QQU2AgggACACQQhqEMICDAELAkAgB0HuAEYEQCAAIAFBfWoiAzYCCCADIARPDQEgACABQX5qIgM2AggCQCAFQX1qLQAAQfUARw0AIAMgBE8NAiAAIAFBf2oiAzYCCCAFQX5qLQAAQewARw0AIAMgBE8NAiAAIAE2AghBACAFQX9qLQAAQewARg0DGgsgAkEJNgIIIAAgAkEIahDDAgwCCyAAIAJBGGpBvIXAABAjIAAQxgIMAQsgAkEFNgIIIAAgAkEIahDDAgsgAkEgaiQAC90CAQR/IAFBCGooAgAhAyABKAIAIQQgACgCACIBKAIEIAEoAggiAkYEQCABIAJBARDmASABKAIIIQILIAEoAgAgAmpB2wA6AAAgASACQQFqIgI2AgggA0UEQCACIAEoAgRGBEAgASACQQEQ5gEgASgCCCECCyABKAIAIAJqQd0AOgAAIAEgAkEBajYCCAsgA0UhBSADQQV0IQEgA0EARyECAkADQCABBEAgAkEBcUUEQCAAKAIAIgMoAgQgAygCCCICRgRAIAMgAkEBEOYBIAMoAgghAgsgAygCACACakEsOgAAIAMgAkEBajYCCAsgAUFgaiEBQQAhAiAEIAAQ8wEhA0EAIQUgBEEgaiEEIANFDQEMAgsLQQAhAyAFDQAgACgCACIAKAIEIAAoAggiBEYEQCAAIARBARDmASAAKAIIIQQLIAAoAgAgBGpB3QA6AAAgACAEQQFqNgIICyADC9wCAQV/IwBBMGsiAiQAIAAoAghFBEAgAEF/NgIIIABBDGoiBCgCACEDIARBADYCACADBEAgAEEQaigCACEEIABBADYCCAJAIAMgBEYNACACIANBCGopAgA3AwAgAkEkakEBNgIAIAJCATcCFCACQeiiwAA2AhAgAkHcADYCLCACIAJBKGo2AiAgAiACNgIoAkAgASACQRBqEKICDQAgA0EUaiAERg0BIANBIGohAwNAIAIgA0F8aikCADcDCCAAKAIEIgUEQCABIAAoAgAgBRCcAw0CCyACQQE2AiQgAkIBNwIUIAJB6KLAADYCECACQdwANgIsIAIgAkEoajYCICACIAJBCGo2AiggASACQRBqEKICDQEgA0EIaiEFIANBFGohAyAEIAVHDQALDAELQQEhBgsgAkEwaiQAIAYPCxCFAwALQbiiwABBECACQRBqQciiwABB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QSBqIAJBCGoQhwECQAJAIAItAHgiBUF9ag4CAgABCyAAIAIoAiA2AgQgAEEANgIAIAJBEGoQiQIgAigCFEUNAyACKAIQEB0MAwsgAigCGCIBIAIoAhRGBEAgAkEQaiABEOABIAIoAhghAQsgAigCECABQeAAbGogAkEgakHYABDaAyIBIAU6AFggASADKAAANgBZIAFB3ABqIAQoAAA2AAAgAiACKAIYQQFqNgIYDAELCyAAIAIpAxA3AgAgAEEIaiACQRhqKAIANgIACyACQYABaiQAC4sCAgR/AX4jAEEwayICJAAgAUEEaiEEIAEoAgRFBEAgASgCACEDIAJBEGoiBUEANgIAIAJCATcDCCACIAJBCGo2AhQgAkEoaiADQRBqKQIANwMAIAJBIGogA0EIaikCADcDACACIAMpAgA3AxggAkEUakGU38AAIAJBGGoQShogBEEIaiAFKAIANgIAIAQgAikDCDcCAAsgAkEgaiIDIARBCGooAgA2AgAgAUEMakEANgIAIAQpAgAhBiABQgE3AgQgAiAGNwMYQQxBBBCrAyIBRQRAQQxBBBDVAwALIAEgAikDGDcCACABQQhqIAMoAgA2AgAgAEHc7sAANgIEIAAgATYCACACQTBqJAALpAIBBn8jAEEQayICJAACfwJAAkACQAJAAkAgACgCCCIBIAAoAgQiA0kEQCAAKAIAIQUDQAJAIAEgBWotAAAiBEF3ag4kAAAEBAAEBAQEBAQEBAQEBAQEBAQEBAQABAQEBAQEBAQEBAQGAwsgACABQQFqIgE2AgggASADRw0ACwsgAkECNgIADAQLIARB3QBGDQELIAJBEzYCAAwCCyAAIAFBAWo2AghBAAwCCyAAIAFBAWoiATYCCAJAIAEgA08NAANAIAEgBWotAAAiBEF3aiIGQRdLQQEgBnRBk4CABHFFckUEQCAAIAFBAWoiATYCCCABIANHDQEMAgsLIARB3QBHDQAgAkESNgIADAELIAJBEzYCAAsgACACEMICCyACQRBqJAAL5QEBCH8jAEFAaiIDJAACQCACRQ0AIANBEGohByADQQhqIQUgA0EEciEIIANBKGohBgNAAkAgA0EgaiABEGcgAygCICIEQQRGDQAgBSAGKQIANwIAIAVBCGogBkEIaikCADcCACAFQRBqIAZBEGooAgA2AgAgAyADKAIkIgk2AgQgAyAENgIAAn8gCCAERQ0AGiAHIAMoAghFDQAaIAkQHSAHCyIEQQRqKAIABEAgBCgCABAdCyACQX9qIgINAQwCCwtBASEKCwJAIApFBEAgACABEGcMAQsgAEEENgIACyADQUBrJAAL5QEBCH8jAEFAaiIDJAACQCACRQ0AIANBEGohByADQQhqIQUgA0EEciEIIANBKGohBgNAAkAgA0EgaiABEGggAygCICIEQQRGDQAgBSAGKQIANwIAIAVBCGogBkEIaikCADcCACAFQRBqIAZBEGooAgA2AgAgAyADKAIkIgk2AgQgAyAENgIAAn8gCCAERQ0AGiAHIAMoAghFDQAaIAkQHSAHCyIEQQRqKAIABEAgBCgCABAdCyACQX9qIgINAQwCCwtBASEKCwJAIApFBEAgACABEGgMAQsgAEEENgIACyADQUBrJAAL5QEBAX8jAEEQayICJAAgACgCACACQQA2AgwgAkEMagJ/IAFBgAFPBEAgAUGAEE8EQCABQYCABE8EQCACIAFBP3FBgAFyOgAPIAIgAUEGdkE/cUGAAXI6AA4gAiABQQx2QT9xQYABcjoADSACIAFBEnZBB3FB8AFyOgAMQQQMAwsgAiABQT9xQYABcjoADiACIAFBDHZB4AFyOgAMIAIgAUEGdkE/cUGAAXI6AA1BAwwCCyACIAFBP3FBgAFyOgANIAIgAUEGdkHAAXI6AAxBAgwBCyACIAE6AAxBAQsQbyACQRBqJAALzQEBA38gAEEMaigCACICIABBCGooAgAiAWtBHG4hAyABIAJHBEAgA0EcbCECA0ACfwJAAkACQAJAAkAgASgCAA4DAQIDAAsgAUEIaigCAEUNAyABQQRqKAIAEB0MAwsgAUEEagwDCyABQQhqKAIARQ0BIAFBBGooAgAQHQwBCyABQQhqKAIARQ0AIAFBBGooAgAQHQsgAUEQagsiA0EEaigCAARAIAMoAgAQHQsgAUEcaiEBIAJBZGoiAg0ACwsgACgCBARAIAAoAgAQHQsL4gEBAX8jAEEQayICJAAgAkEANgIMIAAgAkEMagJ/IAFBgAFPBEAgAUGAEE8EQCABQYCABE8EQCACIAFBP3FBgAFyOgAPIAIgAUEGdkE/cUGAAXI6AA4gAiABQQx2QT9xQYABcjoADSACIAFBEnZBB3FB8AFyOgAMQQQMAwsgAiABQT9xQYABcjoADiACIAFBDHZB4AFyOgAMIAIgAUEGdkE/cUGAAXI6AA1BAwwCCyACIAFBP3FBgAFyOgANIAIgAUEGdkHAAXI6AAxBAgwBCyACIAE6AAxBAQsQbyACQRBqJAAL8wEBBn8gAUEIaigCACICRQRAIABCBDcCACAAIAI2AggPCwJAAkACQAJAIAJB/////wFLDQAgAkECdCIEQQBIDQAgASgCACEFIAJBgICAgAJJQQJ0IQMgBAR/IAQgAxCrAwUgAwsiAUUNASAAIAI2AgQgACABNgIAIAJBAnQhBiACIQMDQCAGBEAgA0UNBSAFKAIAIgcgBygCAEEBaiIENgIAIARFDQQgBUEEaiEFIAEgBzYCACABQQRqIQEgBkF8aiEGIANBf2oiAw0BCwsgACACNgIIDwsQ5QIACyAEIAMQ1QMACwALIAIgAkG4pcAAEKACAAvlAQIDfwF+IwBBEGsiAiQAIAAoAgAhACACIAEQ8AIgAEEcaigCACIDBEAgAEEUaigCACIBQQhqIQQgASkDAEJ/hUKAgYKEiJCgwIB/gyEFA0AgBVAEQCAEIQADQCABQcB+aiEBIAApAwAgAEEIaiIEIQBCf4VCgIGChIiQoMCAf4MiBVANAAsLIAIgAUEAIAV6p0EDdmtBGGxqQWhqIgA2AgggAiAAQQxqNgIMIAIgAkEIakGci8AAIAJBDGpBnIvAABCoAyAFQn98IAWDIQUgA0F/aiIDDQALCyACEJQCIAJBEGokAAvlAQIDfwF+IwBBEGsiAiQAIAAoAgAhACACIAEQ8AIgAEEcaigCACIDBEAgAEEUaigCACIBQQhqIQQgASkDAEJ/hUKAgYKEiJCgwIB/gyEFA0AgBVAEQCAEIQADQCABQaB+aiEBIAApAwAgAEEIaiIEIQBCf4VCgIGChIiQoMCAf4MiBVANAAsLIAIgAUEAIAV6p0EDdmtBHGxqQWRqIgA2AgggAiAAQQxqNgIMIAIgAkEIakGci8AAIAJBDGpBrIvAABCoAyAFQn98IAWDIQUgA0F/aiIDDQALCyACEJQCIAJBEGokAAvlAQIDfwF+IwBBEGsiAiQAIAAoAgAhACACIAEQ8AIgAEEcaigCACIDBEAgAEEUaigCACIBQQhqIQQgASkDAEJ/hUKAgYKEiJCgwIB/gyEFA0AgBVAEQCAEIQADQCABQaB+aiEBIAApAwAgAEEIaiIEIQBCf4VCgIGChIiQoMCAf4MiBVANAAsLIAIgAUEAIAV6p0EDdmtBHGxqQWRqIgA2AgggAiAAQQxqNgIMIAIgAkEIakHsncAAIAJBDGpB/J3AABCoAyAFQn98IAWDIQUgA0F/aiIDDQALCyACEJQCIAJBEGokAAvlAQIDfwF+IwBBEGsiAiQAIAAoAgAhACACIAEQ8AIgAEEcaigCACIDBEAgAEEUaigCACIBQQhqIQQgASkDAEJ/hUKAgYKEiJCgwIB/gyEFA0AgBVAEQCAEIQADQCABQYB9aiEBIAApAwAgAEEIaiIEIQBCf4VCgIGChIiQoMCAf4MiBVANAAsLIAIgAUEAIAV6p0EDdmtBMGxqQVBqIgA2AgggAiAAQRBqNgIMIAIgAkEIakGsnsAAIAJBDGpBvJ7AABCoAyAFQn98IAWDIQUgA0F/aiIDDQALCyACEJQCIAJBEGokAAuVAgIDfwN+IwBBEGsiAiQAAkACQAJAQfi3wQAoAgBFBEBB+LfBAEF/NgIAQfy3wQAoAgAiAEUEQEEgQQgQqwMiAEUNAiAAQoGAgIAQNwMAIABBEGpBADYCAEGItMEAKQMAIQMDQCADQgF8IgRQDQRBiLTBACAEQYi0wQApAwAiBSADIAVRIgEbNwMAIAUhAyABRQ0ACyAAQQA7ARwgACAENwMIQfy3wQAgADYCACAAQRhqQQA2AgALIAAgACgCACIBQQFqNgIAIAFBf0wNA0H4t8EAQfi3wQAoAgBBAWo2AgAgAkEQaiQAIAAPC0Gs38AAQRAgAkEIakG838AAQbTtwAAQkgIAC0EgQQgQ1QMACxDkAgALAAvjAQIDfwF+IwBBEGsiAiQAIAAoAgAhACACIAEQ8AIgAEEcaigCACIDBEAgAEEUaigCACIBQQhqIQQgASkDAEJ/hUKAgYKEiJCgwIB/gyEFA0AgBVAEQCAEIQADQCABQYB/aiEBIAApAwAgAEEIaiIEIQBCf4VCgIGChIiQoMCAf4MiBVANAAsLIAIgASAFeqdBAXRB8AFxa0FwaiIANgIIIAIgAEEMajYCDCACIAJBCGpBjJ7AACACQQxqQZyewAAQqAMgBUJ/fCAFgyEFIANBf2oiAw0ACwsgAhCUAiACQRBqJAAL4AEBAX8jAEHwAGsiAiQAIAJBADYCQCACQgE3AzggACgCACEAIAJByABqIAJBOGpBiM7AABD7AiAAIAJByABqEL8BRQRAIAJBNGpBFzYCACACQSxqQRc2AgAgAkEcakEDNgIAIAJBhQE2AiQgAkIENwIMIAJBkNXAADYCCCACIABBEGo2AjAgAiAAQQxqNgIoIAIgAkE4ajYCICACIAJBIGo2AhggASACQQhqEKICIAIoAjwEQCACKAI4EB0LIAJB8ABqJAAPC0GgzsAAQTcgAkEgakHYzsAAQbTPwAAQkgIAC9gBAAJAIABBIEkNAAJAAn9BASAAQf8ASQ0AGiAAQYCABEkNAQJAIABBgIAITwRAIABBtdlzakG12ytJIABB4ot0akHiC0lyDQQgAEGfqHRqQZ8YSSAAQd7idGpBDklyDQQgAEF+cUGe8ApGDQQgAEFgcUHgzQpHDQEMBAsgAEGzpcEAQSpBh6bBAEHAAUHHp8EAQbYDEJABDwtBACAAQceRdWpBB0kNABogAEGAgLx/akHwg3RJCw8LIABBlKDBAEEoQeSgwQBBoAJBhKPBAEGvAhCQAQ8LQQAL/QEBAX8jAEHQAGsiAiQAIAAoAgAhACACQTRqQeSOwAA2AgAgAkEsakHUjsAANgIAIAJBJGpBxI7AADYCACACQRxqQbSOwAA2AgAgAkEUakG0jsAANgIAIAIgAEFAazYCOCACIABB2ABqNgI8IAIgAEHZAGo2AkAgAiAANgJEIAIgAEEgajYCSCACQaSOwAA2AgwgAiAAQcwAajYCTCACIAJBzABqNgIwIAIgAkHIAGo2AiggAiACQcQAajYCICACIAJBQGs2AhggAiACQTxqNgIQIAIgAkE4ajYCCCABQfSOwABBB0H0jcAAQQYgAkEIakEGEMMBIAJB0ABqJAALyAEBAn8gACgCACIBIAEoAgBBf2oiADYCAAJAIAANACABQewAaigCAARAIAFB6ABqKAIAEB0LIAFB9ABqIgAoAgAEQCAAENoBCyABQRhqELYBIAFBOGoQugEgAUHYAGoQVCABQYABaigCACICBEAgAUH4AGooAgAhACACQQJ0IQIDQCAAENoBIABBBGohACACQXxqIgINAAsLIAFB/ABqKAIABEAgASgCeBAdCyABQQRqIgAgACgCAEF/aiIANgIAIAANACABEB0LC90BAQN/IwBBIGsiAyQAAkACQCABIAJqIgIgAUkNACAAQQRqKAIAIgFBAXQiBCACIAQgAksbIgJBBCACQQRLGyICQQJ0IQQgAkGAgICAAklBAnQhBQJAIAEEQCADQQQ2AhggAyABQQJ0NgIUIAMgACgCADYCEAwBCyADQQA2AhgLIAMgBCAFIANBEGoQ9QEgAygCBCEBIAMoAgBFBEAgACABNgIAIABBBGogAjYCAAwCCyADQQhqKAIAIgBBgYCAgHhGDQEgAEUNACABIAAQ1QMACxDlAgALIANBIGokAAvcAQEDfyMAQSBrIgMkAAJAAkAgASACaiICIAFJDQAgAEEEaigCACIBQQF0IgQgAiAEIAJLGyICQQQgAkEESxsiAkEFdCEEIAJBgICAIElBA3QhBQJAIAEEQCADQQg2AhggAyABQQV0NgIUIAMgACgCADYCEAwBCyADQQA2AhgLIAMgBCAFIANBEGoQ9QEgAygCBCEBIAMoAgBFBEAgACABNgIAIABBBGogAjYCAAwCCyADQQhqKAIAIgBBgYCAgHhGDQEgAEUNACABIAAQ1QMACxDlAgALIANBIGokAAvdAQEDfyMAQSBrIgMkAAJAAkAgASACaiICIAFJDQAgAEEEaigCACIBQQF0IgQgAiAEIAJLGyICQQQgAkEESxsiAkEDdCEEIAJBgICAgAFJQQJ0IQUCQCABBEAgA0EENgIYIAMgAUEDdDYCFCADIAAoAgA2AhAMAQsgA0EANgIYCyADIAQgBSADQRBqEPUBIAMoAgQhASADKAIARQRAIAAgATYCACAAQQRqIAI2AgAMAgsgA0EIaigCACIAQYGAgIB4Rg0BIABFDQAgASAAENUDAAsQ5QIACyADQSBqJAAL3AEBA38jAEEgayIDJAACQAJAIAEgAmoiAiABSQ0AIABBBGooAgAiAUEBdCIEIAIgBCACSxsiAkEEIAJBBEsbIgJBHGwhBCACQaWSySRJQQJ0IQUCQCABBEAgA0EENgIYIAMgAUEcbDYCFCADIAAoAgA2AhAMAQsgA0EANgIYCyADIAQgBSADQRBqEPUBIAMoAgQhASADKAIARQRAIAAgATYCACAAQQRqIAI2AgAMAgsgA0EIaigCACIAQYGAgIB4Rg0BIABFDQAgASAAENUDAAsQ5QIACyADQSBqJAAL2gEBBH8jAEEgayICJAACQAJAIAFBAWoiAUUNACAAQQRqKAIAIgNBAXQiBCABIAQgAUsbIgFBBCABQQRLGyIBQRRsIQQgAUHnzJkzSUECdCEFAkAgAwRAIAJBBDYCGCACIANBFGw2AhQgAiAAKAIANgIQDAELIAJBADYCGAsgAiAEIAUgAkEQahD1ASACKAIEIQMgAigCAEUEQCAAIAM2AgAgAEEEaiABNgIADAILIAJBCGooAgAiAEGBgICAeEYNASAARQ0AIAMgABDVAwALEOUCAAsgAkEgaiQAC9wBAQR/IwBBIGsiAiQAAkACQCABQQFqIgFFDQAgAEEEaigCACIDQQF0IgQgASAEIAFLGyIBQQQgAUEESxsiAUHgAGwhBCABQdaq1QpJQQN0IQUCQCADBEAgAkEINgIYIAIgA0HgAGw2AhQgAiAAKAIANgIQDAELIAJBADYCGAsgAiAEIAUgAkEQahD1ASACKAIEIQMgAigCAEUEQCAAIAM2AgAgAEEEaiABNgIADAILIAJBCGooAgAiAEGBgICAeEYNASAARQ0AIAMgABDVAwALEOUCAAsgAkEgaiQAC9oBAQR/IwBBIGsiAiQAAkACQCABQQFqIgFFDQAgAEEEaigCACIDQQF0IgQgASAEIAFLGyIBQQQgAUEESxsiAUEYbCEEIAFB1qrVKklBAnQhBQJAIAMEQCACQQQ2AhggAiADQRhsNgIUIAIgACgCADYCEAwBCyACQQA2AhgLIAIgBCAFIAJBEGoQ9QEgAigCBCEDIAIoAgBFBEAgACADNgIAIABBBGogATYCAAwCCyACQQhqKAIAIgBBgYCAgHhGDQEgAEUNACADIAAQ1QMACxDlAgALIAJBIGokAAvbAQEEfyMAQSBrIgIkAAJAAkAgAUEBaiIBRQ0AIABBBGooAgAiA0EBdCIEIAEgBCABSxsiAUEEIAFBBEsbIgFBAnQhBCABQYCAgIACSUECdCEFAkAgAwRAIAJBBDYCGCACIANBAnQ2AhQgAiAAKAIANgIQDAELIAJBADYCGAsgAiAEIAUgAkEQahD1ASACKAIEIQMgAigCAEUEQCAAIAM2AgAgAEEEaiABNgIADAILIAJBCGooAgAiAEGBgICAeEYNASAARQ0AIAMgABDVAwALEOUCAAsgAkEgaiQAC8wBACAAAn8gAUGAAU8EQCABQYAQTwRAIAFBgIAETwRAIAIgAUE/cUGAAXI6AAMgAiABQQZ2QT9xQYABcjoAAiACIAFBDHZBP3FBgAFyOgABIAIgAUESdkEHcUHwAXI6AABBBAwDCyACIAFBP3FBgAFyOgACIAIgAUEMdkHgAXI6AAAgAiABQQZ2QT9xQYABcjoAAUEDDAILIAIgAUE/cUGAAXI6AAEgAiABQQZ2QcABcjoAAEECDAELIAIgAToAAEEBCzYCBCAAIAI2AgAL8wEBAX8jAEEQayICJAACfwJAAkACQAJAIAAoAgBBAWsOAwECAwALIAIgAEEEajYCDCABQZCywABBBCACQQxqQbyxwAAQ6wEMAwsgAiAAQQRqNgIIIAIgAEEQajYCDCABQfSxwABBCSACQQhqQbyxwAAgAkEMakGAssAAEOUBDAILIAIgAEEEajYCCCACIABBEGo2AgwgAUHcscAAQQcgAkEIakG8scAAIAJBDGpB5LHAABDlAQwBCyACIABBBGo2AgggAiAAQRBqNgIMIAFBuLHAAEEDIAJBCGpBvLHAACACQQxqQcyxwAAQ5QELIAJBEGokAAvfAQEBfyMAQRBrIgckACAHIAAoAhggASACIABBHGooAgAoAgwRAgA6AAggByAANgIAIAcgAkU6AAkgB0EANgIEIAcgAyAEEK0BIAUgBhCtASEBAn8gBy0ACCIAIAcoAgQiAkUNABogAEH/AXEhA0EBIAMNABogASgCACEBAkAgAkEBRw0AIActAAlFDQAgAS0AAEEEcQ0AQQEgASgCGEHslMEAQQEgAUEcaigCACgCDBECAA0BGgsgASgCGEGMksEAQQEgAUEcaigCACgCDBECAAsgB0EQaiQAQf8BcUEARwvPAQECfyMAQSBrIgMkAAJAAkAgASACaiICIAFJDQAgAEEEaigCACIBQQF0IgQgAiAEIAJLGyICQQggAkEISxsiAkF/c0EfdiEEAkAgAQRAIANBATYCGCADIAE2AhQgAyAAKAIANgIQDAELIANBADYCGAsgAyACIAQgA0EQahD1ASADKAIEIQEgAygCAEUEQCAAIAE2AgAgAEEEaiACNgIADAILIANBCGooAgAiAEGBgICAeEYNASAARQ0AIAEgABDVAwALEOUCAAsgA0EgaiQAC8sBAgN/AX4jAEEQayICJAAgACgCACEAIAIgARD+AiAAQRxqKAIAIgMEQCAAQRRqKAIAIgFBCGohBCABKQMAQn+FQoCBgoSIkKDAgH+DIQUDQCAFUARAIAQhAANAIAFBYGohASAAKQMAIABBCGoiBCEAQn+FQoCBgoSIkKDAgH+DIgVQDQALCyACIAEgBXqnQQF2QTxxa0F8ajYCDCACIAJBDGpBnJ7AABC/AyAFQn98IAWDIQUgA0F/aiIDDQALCyACEPUCIAJBEGokAAvPAQECfyMAQSBrIgMkAAJAAkAgASACaiICIAFJDQAgAEEEaigCACIBQQF0IgQgAiAEIAJLGyICQQggAkEISxsiAkF/c0EfdiEEAkAgAQRAIANBATYCGCADIAE2AhQgAyAAKAIANgIQDAELIANBADYCGAsgAyACIAQgA0EQahDuASADKAIEIQEgAygCAEUEQCAAIAE2AgAgAEEEaiACNgIADAILIANBCGooAgAiAEGBgICAeEYNASAARQ0AIAEgABDVAwALEOUCAAsgA0EgaiQAC80BAQN/IwBBIGsiAiQAAkACQCABQQFqIgFFDQAgAEEEaigCACIDQQF0IgQgASAEIAFLGyIBQQggAUEISxsiAUF/c0EfdiEEAkAgAwRAIAJBATYCGCACIAM2AhQgAiAAKAIANgIQDAELIAJBADYCGAsgAiABIAQgAkEQahD1ASACKAIEIQMgAigCAEUEQCAAIAM2AgAgAEEEaiABNgIADAILIAJBCGooAgAiAEGBgICAeEYNASAARQ0AIAMgABDVAwALEOUCAAsgAkEgaiQAC80BAQN/IwBBIGsiAiQAAkACQCABQQFqIgFFDQAgAEEEaigCACIDQQF0IgQgASAEIAFLGyIBQQggAUEISxsiAUF/c0EfdiEEAkAgAwRAIAJBATYCGCACIAM2AhQgAiAAKAIANgIQDAELIAJBADYCGAsgAiABIAQgAkEQahDuASACKAIEIQMgAigCAEUEQCAAIAM2AgAgAEEEaiABNgIADAILIAJBCGooAgAiAEGBgICAeEYNASAARQ0AIAMgABDVAwALEOUCAAsgAkEgaiQAC9gBAQF/IwBBEGsiBSQAIAUgACgCGCABIAIgAEEcaigCACgCDBECADoACCAFIAA2AgAgBSACRToACSAFQQA2AgQgBSADIAQQrQEhAQJ/IAUtAAgiACAFKAIEIgJFDQAaIABB/wFxIQNBASADDQAaIAEoAgAhAQJAIAJBAUcNACAFLQAJRQ0AIAEtAABBBHENAEEBIAEoAhhB7JTBAEEBIAFBHGooAgAoAgwRAgANARoLIAEoAhhBjJLBAEEBIAFBHGooAgAoAgwRAgALIAVBEGokAEH/AXFBAEcLywEBAX8jAEFAaiIEJAAgBCABNgIMIAQgADYCCAJ/IANFBEAgBEEkakEBNgIAIARCAjcCFCAEQeSVwAA2AhAgBEEYNgIsIAQgBEEoajYCICAEIARBCGo2AiggBEEQahDEAgwBCyAEQTRqQTA2AgAgBEEkakECNgIAIARCAjcCFCAEQbyVwAA2AhAgBEEYNgIsIAQgAzYCPCAEIAI2AjggBCAEQShqNgIgIAQgBEE4ajYCMCAEIARBCGo2AiggBEEQahDEAgsgBEFAayQAC8cBAQR/IwBBIGsiAiQAAkACQCAAQQRqKAIAIgUgAU8EQCAFRQ0CIAAoAgAhBEEBIQMCQAJAIAEEQCABQX9KDQIgAUEBEKsDIgNFDQEgAyAEIAEQ2gMaCyAEEB0MAwsQ5QIACyAEIAVBASABEKADIgMNASABQQEQ1QMACyACQRxqQQA2AgAgAkGAzcAANgIYIAJCATcCDCACQaTNwAA2AgggAkEIakH4zcAAEOYCAAsgACADNgIAIABBBGogATYCAAsgAkEgaiQAC7oBAAJAIAIEQAJAAkACfwJAAkAgAUEATgRAIAMoAggNASABDQJBASECDAQLDAYLIAMoAgQiAkUEQCABRQRAQQEhAgwECyABQQEQqwMMAgsgAygCACACQQEgARCgAwwBCyABQQEQqwMLIgJFDQELIAAgAjYCBCAAQQhqIAE2AgAgAEEANgIADwsgACABNgIEIABBCGpBATYCACAAQQE2AgAPCyAAIAE2AgQLIABBCGpBADYCACAAQQE2AgAL7wEBA38jAEEgayIFJABBhLTBAEGEtMEAKAIAIgdBAWo2AgBBgLjBAEGAuMEAKAIAQQFqIgY2AgACQAJAIAdBAEggBkECS3INACAFIAQ6ABggBSADNgIUIAUgAjYCEEH4s8EAKAIAIgJBf0wNAEH4s8EAIAJBAWoiAjYCAEH4s8EAQYC0wQAoAgAiAwR/QfyzwQAoAgAgBSAAIAEoAhARAQAgBSAFKQMANwMIIAVBCGogAygCFBEBAEH4s8EAKAIABSACC0F/ajYCACAGQQFLDQAgBA0BCwALIwBBEGsiAiQAIAIgATYCDCACIAA2AggAC5sBAQV/IABBDGooAgAiASAAQQhqKAIAIgNrQeAAbiECIAEgA0cEQCACQeAAbCEEQQAhAgNAIAIgA2oiAUHEAGooAgAEQCABQUBrKAIAEB0LIAFBEGoQtgEgAUEwahC+ASABQcwAaiIFEIkCIAFB0ABqKAIABEAgBSgCABAdCyAEIAJB4ABqIgJHDQALCyAAKAIEBEAgACgCABAdCwurAQEDfwJAIAJBD00EQCAAIQMMAQsgAEEAIABrQQNxIgRqIQUgBARAIAAhAwNAIAMgAToAACADQQFqIgMgBUkNAAsLIAUgAiAEayICQXxxIgRqIQMgBEEBTgRAIAFB/wFxQYGChAhsIQQDQCAFIAQ2AgAgBUEEaiIFIANJDQALCyACQQNxIQILIAIEQCACIANqIQIDQCADIAE6AAAgA0EBaiIDIAJJDQALCyAAC8UBAQJ/IwBBEGsiAiQAIAAoAhhB2K3AAEEHIABBHGooAgAoAgwRAgAhAyACQQA6AA0gAiADOgAMIAIgADYCCCACQQhqQd+twABBBSABQeStwAAQkgEhAAJ/IAItAAwiASACLQANRQ0AGkEBIAENABogACgCACIALQAAQQRxRQRAIAAoAhhB55TBAEECIABBHGooAgAoAgwRAgAMAQsgACgCGEHZlMEAQQEgAEEcaigCACgCDBECAAsgAkEQaiQAQf8BcUEARwu5AQEDfyMAQRBrIgMkACABKAIAIgIoAgQgAigCCCIERgRAIAIgBEEBEOYBIAIoAgghBAsgAigCACAEakH7ADoAACADQQE6AAwgAiAEQQFqNgIIIAMgATYCCAJAIANBCGogABA7IgINACADLQAMRQ0AIAMoAggoAgAiACgCBCAAKAIIIgFGBEAgACABQQEQ5gEgACgCCCEBCyAAKAIAIAFqQf0AOgAAIAAgAUEBajYCCAsgA0EQaiQAIAILqAEBAX8jAEHQAWsiASQAAkAgAARAIAAoAgANASAAQQA2AgAgAUHoAGogAEHoABDaAxogAUEIaiABQfAAakHgABDaAxogABAdIAFBzABqKAIABEAgASgCSBAdCyABQRhqELYBIAFBOGoQvgEgAUHUAGoQiQIgAUHYAGooAgAEQCABKAJUEB0LIAFB0AFqJAAPC0HgssAAQRsQzgMAC0H7ssAAQc8AEM4DAAutAQEBfwJAIAIEQAJ/AkACQAJAIAFBAE4EQCADKAIIRQ0CIAMoAgQiBA0BIAENAyACDAQLIABBCGpBADYCAAwFCyADKAIAIAQgAiABEKADDAILIAENACACDAELIAEgAhCrAwsiAwRAIAAgAzYCBCAAQQhqIAE2AgAgAEEANgIADwsgACABNgIEIABBCGogAjYCAAwBCyAAIAE2AgQgAEEIakEANgIACyAAQQE2AgALuwEBAX8jAEEwayIDJAAgAyACNgIEIAMgATYCAAJ/IAAtAABBB0YEQCADQRxqQQE2AgAgA0IBNwIMIANB/NXAADYCCCADQYYBNgIkIAMgA0EgajYCGCADIAM2AiAgA0EIahDFAgwBCyADQSxqQYYBNgIAIANBHGpBAjYCACADQgI3AgwgA0HM1cAANgIIIANBLzYCJCADIAA2AiAgAyADQSBqNgIYIAMgAzYCKCADQQhqEMUCCyADQTBqJAALwwEBAn8jAEEQayICJAAgAAJ/QQEgAC0ABA0AGiAAKAIAIQEgAEEFai0AAEUEQCABKAIYQeCUwQBBByABQRxqKAIAKAIMEQIADAELIAEtAABBBHFFBEAgASgCGEHalMEAQQYgAUEcaigCACgCDBECAAwBCyACQQE6AA8gAiABKQIYNwMAIAIgAkEPajYCCEEBIAJB1pTBAEEDEG8NABogASgCGEHZlMEAQQEgASgCHCgCDBECAAsiADoABCACQRBqJAAgAAusAQEDfyMAQTBrIgIkACABQQRqIQMgASgCBEUEQCABKAIAIQEgAkEQaiIEQQA2AgAgAkIBNwMIIAIgAkEIajYCFCACQShqIAFBEGopAgA3AwAgAkEgaiABQQhqKQIANwMAIAIgASkCADcDGCACQRRqQZTfwAAgAkEYahBKGiADQQhqIAQoAgA2AgAgAyACKQMINwIACyAAQdzuwAA2AgQgACADNgIAIAJBMGokAAupAQEDfyMAQRBrIgIkAAJAAkBBgAFBARCrAyIDBEAgAkKAATcCBCACIAM2AgAgAiACNgIMIAJBDGogARCdASIBBEAgAigCBEUNAiACKAIAEB0MAgsgAigCBCEBIAIoAgAiA0UNASADIAIoAggQACEEIABBADYCACAAIAQ2AgQgAUUNAiADEB0MAgtBgAFBARDVAwALIABBATYCACAA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OgAAIAEgAyAEajYCCA8LIABCBDcCACABQQA6AAwLZgECfyMAQRBrIgIkACAAQQhqKAIAIQMgACgCACEAIAIgARD9AiADBEAgA0ECdCEBA0AgAiAANgIMIAIgAkEMakHMnsAAEL8DIABBBGohACABQXxqIgENAAsLIAIQ9gIgAkEQaiQAC2YBAn8jAEEQayICJAAgAEEIaigCACEDIAAoAgAhACACIAEQ/QIgAwRAIANBHGwhAQNAIAIgADYCDCACIAJBDGpB3J7AABC/AyAAQRxqIQAgAUFkaiIBDQALCyACEPYCIAJBEGokAAttAQF/IAAoAgQgACgCCCICa0ECTQRAIAAgAkEDEOYBIAAoAgghAgsgACACQQNqNgIIIAAoAgAgAmoiACABQT9xQYABcjoAAiAAIAFB//8DcSIBQQx2QeABcjoAACAAIAFBBnZBP3FBgAFyOgABC3wBA38gACAAEOsDIgBBCBCfAyAAayICEOkDIQBBxLfBACABIAJrIgE2AgBBzLfBACAANgIAIAAgAUEBcjYCBEEIQQgQnwMhAkEUQQgQnwMhA0EQQQgQnwMhBCAAIAEQ6QMgBCADIAJBCGtqajYCBEHot8EAQYCAgAE2AgALbgEBfyMAQTBrIgMkACADIAI2AgQgAyABNgIAIANBHGpBAjYCACADQSxqQS42AgAgA0ICNwIMIANBqJTAADYCCCADQS82AiQgAyAANgIgIAMgA0EgajYCGCADIAM2AiggA0EIahDEAiADQTBqJAALfQMBfwF+AXwjAEEQayIDJAACQAJAAkACQCAAKAIAQQFrDgIBAgALIAArAwghBSADQQM6AAAgAyAFOQMIDAILIAApAwghBCADQQE6AAAgAyAENwMIDAELIAApAwghBCADQQI6AAAgAyAENwMICyADIAEgAhD2ASADQRBqJAALbgEEfyMAQSBrIgIkAEEBIQMCQCAAIAEQpQENACABQRxqKAIAIQQgASgCGCACQQA2AhwgAkHo+cAANgIYIAJCATcCDCACQZCSwQA2AgggBCACQQhqEEoNACAAQQRqIAEQpQEhAwsgAkEgaiQAIAMLbQEBfyMAQTBrIgMkACADIAE2AgQgAyAANgIAIANBHGpBAjYCACADQSxqQRc2AgAgA0ICNwIMIANB2JLBADYCCCADQRc2AiQgAyADQSBqNgIYIAMgAzYCKCADIANBBGo2AiAgA0EIaiACEOYCAAtWAQJ/IwBBIGsiAiQAIAFBHGooAgAhAyABKAIYIAJBGGogAEEQaikCADcDACACQRBqIABBCGopAgA3AwAgAiAAKQIANwMIIAMgAkEIahBKIAJBIGokAAtWAQJ/IwBBIGsiAiQAIABBHGooAgAhAyAAKAIYIAJBGGogAUEQaikCADcDACACQRBqIAFBCGopAgA3AwAgAiABKQIANwMIIAMgAkEIahBKIAJBIGokAAttAQF/IwBBMGsiAyQAIAMgATYCBCADIAA2AgAgA0EcakECNgIAIANBLGpBFzYCACADQgI3AgwgA0Hcm8EANgIIIANBFzYCJCADIANBIGo2AhggAyADQQRqNgIoIAMgAzYCICADQQhqIAIQ5gIAC20BAX8jAEEwayIDJAAgAyABNgIEIAMgADYCACADQRxqQQI2AgAgA0EsakEXNgIAIANCAjcCDCADQfybwQA2AgggA0EXNgIkIAMgA0EgajYCGCADIANBBGo2AiggAyADNgIgIANBCGogAhDmAgALbQEBfyMAQTBrIgMkACADIAE2AgQgAyAANgIAIANBHGpBAjYCACADQSxqQRc2AgAgA0ICNwIMIANBsJzBADYCCCADQRc2AiQgAyADQSBqNgIYIAMgA0EEajYCKCADIAM2AiAgA0EIaiACEOYCAAtdAQF/IwBBIGsiAiQAIAJBCGogARD3AiACIAA2AhggAiAAQQRqNgIcIAJBCGogAkEYakHYosAAEK0BGiACQQhqIAJBHGpB2KLAABCtARogAkEIahCKAiACQSBqJAALZwEBfyMAQSBrIgIkACACQaTwwAA2AgQgAiAANgIAIAJBGGogAUEQaikCADcDACACQRBqIAFBCGopAgA3AwAgAiABKQIANwMIIAJB8N/AACACQQRqQfDfwAAgAkEIakGI8cAAEIsBAAtkAQF/IwBBIGsiAyQAIANB/OvAADYCBCADIAA2AgAgA0EYaiABQRBqKQIANwMAIANBEGogAUEIaikCADcDACADIAEpAgA3AwggA0GA4MAAIANBBGpBgODAACADQQhqIAIQiwEAC2QBAX8jAEEgayIDJAAgAyABNgIEIAMgADYCACADQRhqIAJBEGopAgA3AwAgA0EQaiACQQhqKQIANwMAIAMgAikCADcDCCADQYCTwQAgA0EEakGAk8EAIANBCGpBuPrAABCLAQALZAEBfyMAQSBrIgMkACADIAE2AgQgAyAANgIAIANBGGogAkEQaikCADcDACADQRBqIAJBCGopAgA3AwAgAyACKQIANwMIIANBvKzBACADQQRqQbyswQAgA0EIakGMmsEAEIsBAAtZAQF/IwBBIGsiAiQAIAIgACgCADYCBCACQRhqIAFBEGopAgA3AwAgAkEQaiABQQhqKQIANwMAIAIgASkCADcDCCACQQRqQaCMwAAgAkEIahBKIAJBIGokAAtZAQF/IwBBIGsiAiQAIAIgACgCADYCBCACQRhqIAFBEGopAgA3AwAgAkEQaiABQQhqKQIANwMAIAIgASkCADcDCCACQQRqQcDZwAAgAkEIahBKIAJBIGokAAtvACAAKAIAIgEoAgAhACABQQA2AgACQCAABEBBgAhBARCrAyIBRQ0BIABBADoAHCAAQQA6ABggAEKACDcCECAAIAE2AgwgAEEANgIIIABCADcCAA8LQZDgwABBK0H46sAAENgCAAtBgAhBARDVAwALWQEBfyMAQSBrIgIkACACIAAoAgA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEakH83sAAIAJBCGoQSiACQSBqJAALWQEBfyMAQSBrIgIkACACIAAoAgA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEakGU38AAIAJBCGoQSiACQSBqJAALWQEBfyMAQSBrIgIkACACIAAoAgA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEakHk3sAAIAJBCGoQSiACQSBqJAALaAAjAEEwayIBJABBqLPBAC0AAARAIAFBHGpBATYCACABQgI3AgwgAUHo7cAANgIIIAFBFzYCJCABIAA2AiwgASABQSBqNgIYIAEgAUEsajYCICABQQhqQZDuwAAQ5gIACyABQTBqJAALWQEBfyMAQSBrIgIkACACIAAoAgA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEakGc+MAAIAJBCGoQSiACQSBqJAALaAECfyABKAIAIQMCQAJAAkAgAUEIaigCACIBRQRAQQEhAgwBCyABQX9MDQEgAUEBEKsDIgJFDQILIAIgAyABENoDIQIgACABNgIIIAAgATYCBCAAIAI2AgAPCxDlAgALIAFBARDVAwALWQEBfyMAQSBrIgIkACACIAAoAgA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEakH4mMEAIAJBCGoQSiACQSBqJAALVgEBfyMAQSBrIgIkACACIAA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEakGgjMAAIAJBCGoQSiACQSBqJAALUAECfyAAQQxqKAIAIgEgAEEIaigCACICRwRAIAEgAmtBA3ZBA3QhAQNAIAIQ2gEgAkEIaiECIAFBeGoiAQ0ACwsgACgCBARAIAAoAgAQHQsLZgEBfyMAQRBrIgIkAAJ/IAAoAgAiAC0AAEEDRwRAIAIgADYCCCABQdSswABBCSACQQhqQeCswAAQ6wEMAQsgAiAAQQRqNgIMIAFBnKzAAEEEIAJBDGpBxKzAABDrAQsgAkEQaiQAC1YBAX8jAEEgayICJAAgAiAANgIEIAJBGGogAUEQaikCADcDACACQRBqIAFBCGopAgA3AwAgAiABKQIANwMIIAJBBGpBwNnAACACQQhqEEogAkEgaiQAC1YBAX8jAEEgayICJAAgAiAANgIEIAJBGGogAUEQaikCADcDACACQRBqIAFBCGopAgA3AwAgAiABKQIANwMIIAJBBGpB5N7AACACQQhqEEogAkEgaiQAC1YBAX8jAEEgayICJAAgAiAANgIEIAJBGGogAUEQaikCADcDACACQRBqIAFBCGopAgA3AwAgAiABKQIANwMIIAJBBGpB/N7AACACQQhqEEogAkEgaiQAC1YBAX8jAEEgayICJAAgAiAANgIEIAJBGGogAUEQaikCADcDACACQRBqIAFBCGopAgA3AwAgAiABKQIANwMIIAJBBGpB+JjBACACQQhqEEogAkEgaiQAC2MBAX8jAEEQayICJAACfyAAKAIAIgAoAgAEQCACIAA2AgggAUGIlsAAQQIgAkEIakGMlsAAEOsBDAELIAIgAEEEajYCDCABQfSVwABBAyACQQxqQfiVwAAQ6wELIAJBEGokAAtgAQF/IwBBMGsiAiQAIAIgATYCDCACIAA2AgggAkEkakEBNgIAIAJCAjcCFCACQciUwAA2AhAgAkEYNgIsIAIgAkEoajYCICACIAJBCGo2AiggAkEQahDEAiACQTBqJAALYAEBfyMAQTBrIgIkACACIAE2AgwgAiAANgIIIAJBJGpBATYCACACQgI3AhQgAkGMlcAANgIQIAJBGDYCLCACIAJBKGo2AiAgAiACQQhqNgIoIAJBEGoQxAIgAkEwaiQAC2MBAX8jAEEQayICJAACfyAAKAIAIgAtAFhBA0cEQCACIAA2AgggAUGIlsAAQQIgAkEIakGclsAAEOsBDAELIAIgADYCDCABQfSVwABBAyACQQxqQfiVwAAQ6wELIAJBEGokAAteAQF/IwBBQGoiAiQAIAJBADYCCCACQgE3AwAgAkEQaiACQdCSwAAQ+wIgACABIAJBEGoQ1gMEQEHoksAAQTcgAkE4akGgk8AAQfyTwAAQkgIACyACEBAgAkFAayQAC1EBAX8CQCAAQRBqKAIAIgFFDQAgAUEAOgAAIABBFGooAgBFDQAgACgCEBAdCwJAIABBf0YNACAAIAAoAgQiAUF/ajYCBCABQQFHDQAgABAdCwtSAQJ/IwBBIGsiAiQAIAJBCGogABDBASACKAIMIQAgAigCCCEDIAJBGGogAUEIaigCADYCACACIAEpAgA3AxAgAkEQaiADIAAQ3QIgAkEgaiQAC1IBAn8jAEEgayICJAAgAkEIaiAAELwBIAIoAgwhACACKAIIIQMgAkEYaiABQQhqKAIANgIAIAIgASkCADcDECACQRBqIAMgABDdAiACQSBqJAALXAEBfyMAQUBqIgEkACABQQA2AgggAUIBNwMAIAFBEGogAUHQksAAEPsCIAAgAUEQahChAgRAQeiSwABBNyABQThqQaCTwABB/JPAABCSAgALIAEQECABQUBrJAALXAEBfyMAQUBqIgEkACABQQA2AgggAUIBNwMAIAFBEGogAUGIzsAAEPsCIAAgAUEQahChAgRAQaDOwABBNyABQThqQdjOwABBtM/AABCSAgALIAEQECABQUBrJAALTgEBfyMAQRBrIgIkAAJAIAAoAgwEQCAAIQEMAQsgAkEIaiAAQQhqKAIANgIAIAIgACkCADcDACABIAIQwwIhASAAEB0LIAJBEGokACABC1YBAn8gASgCACECIAFBADYCAAJAIAIEQCABKAIEIQNBCEEEEKsDIgFFDQEgASADNgIEIAEgAjYCACAAQYyfwAA2AgQgACABNgIADwsAC0EIQQQQ1QMAC1YBAX8jAEEgayICJAAgACgCACEAIAJBFGpBATYCACACQgI3AgQgAkGgqsAANgIAIAJB9wA2AhwgAiAANgIYIAIgAkEYajYCECABIAIQogIgAkEgaiQAC1YBAn8gASgCACECIAFBADYCAAJAIAIEQCABKAIEIQNBCEEEEKsDIgFFDQEgASADNgIEIAEgAjYCACAAQajewAA2AgQgACABNgIADwsAC0EIQQQQ1QMAC04BAn8gAC0ABEEDRgRAIABBCGooAgAiASgCACABKAIEKAIAEQMAIAEoAgQiAkEEaigCAARAIAJBCGooAgAaIAEoAgAQHQsgACgCCBAdCwtfAQN/IwBBEGsiASQAAkAgACgCDCICBEAgACgCCCIDRQ0BIAEgAjYCCCABIAA2AgQgASADNgIAIAEQ+gIAC0GQ4MAAQStBzO7AABDYAgALQZDgwABBK0G87sAAENgCAAtSAQF/IwBBEGsiAiQAAn8gACgCACIALQAAQQJGBEAgAUG8lsAAQQQQnAMMAQsgAiAANgIMIAFBuJbAAEEEIAJBDGpBwJbAABDrAQsgAkEQaiQAC08BAX8jAEEgayICJAAgAkEUakEBNgIAIAJCAjcCBCACQaCqwAA2AgAgAkH3ADYCHCACIAA2AhggAiACQRhqNgIQIAEgAhCiAiACQSBqJAALTgEBfyAAKAIAKAIAIgBBBGooAgAgACgCCCIDayACSQRAIAAgAyACEOYBIAAoAgghAwsgACgCACADaiABIAIQ2gMaIAAgAiADajYCCEEAC0cBAX8jAEEgayIAJABB0LPBACgCAEEDRwRAIABB1LPBADYCCCAAIABBGGo2AgwgACAAQQhqNgIUIABBFGoQPQsgAEEgaiQAC0ABAX8jAEEgayIAJAAgAEEcakEANgIAIABBmPfAADYCGCAAQgE3AgwgAEG098AANgIIIABBCGpBjPjAABDmAgALQwEDfwJAIAJFDQADQCAALQAAIgQgAS0AACIFRgRAIABBAWohACABQQFqIQEgAkF/aiICDQEMAgsLIAQgBWshAwsgAwtQAQF/IwBBEGsiAiQAAn8gACgCACIAKAIARQRAIAFBqLLAAEEEEJwDDAELIAIgADYCDCABQaSywABBBCACQQxqQayywAAQ6wELIAJBEGokAAtLAQF/IAAoAgAiAEEEaigCACAAKAIIIgNrIAJJBEAgACADIAIQ5gEgACgCCCEDCyAAKAIAIANqIAEgAhDaAxogACACIANqNgIIQQALPQEBfyAAQRBqKAIABEAgAEEMaigCABAdCwJAIABBf0YNACAAIAAoAgQiAUF/ajYCBCABQQFHDQAgABAdCwtLAQF/IAAoAgAiAEEEaigCACAAKAIIIgNrIAJJBEAgACADIAIQ6AEgACgCCCEDCyAAKAIAIANqIAEgAhDaAxogACACIANqNgIIQQALSAEBfyAAKAIAIgAoAgQgACgCCCIDayACSQRAIAAgAyACEOYBIAAoAgghAwsgACgCACADaiABIAIQ2gMaIAAgAiADajYCCEEAC0MBAX8gACgCBCAAKAIIIgNrIAJJBEAgACADIAIQ5gEgACgCCCEDCyAAKAIAIANqIAEgAhDaAxogACACIANqNgIIQQALSAEBfyMAQSBrIgMkACADQRRqQQA2AgAgA0Ho+cAANgIQIANCATcCBCADIAE2AhwgAyAANgIYIAMgA0EYajYCACADIAIQ5gIAC0kBAX8jAEEgayICJAAgAkEUakEBNgIAIAJCATcCBCACQeiSwQA2AgAgAkHGATYCHCACIAA2AhggAiACQRhqNgIQIAIgARDmAgALQQAjAEEgayIAJAAgAEEcakEANgIAIABBoIzAADYCGCAAQgE3AgwgAEGYjMAANgIIIAEgAEEIahCiAiAAQSBqJAALQQAjAEEgayIAJAAgAEEcakEANgIAIABBlLLAADYCGCAAQgE3AgwgAEGcssAANgIIIAEgAEEIahCiAiAAQSBqJAALQQEBfyAAKAIEIAAoAggiA2sgAkkEQCAAIAMgAhDmASAAKAIIIQMLIAAoAgAgA2ogASACENoDGiAAIAIgA2o2AggLQwEBf0EUQQQQqwMiA0UEQEEUQQQQ1QMACyADIAI2AhAgAyABNgIMIAMgACkCADcCACADQQhqIABBCGooAgA2AgAgAwtGAQJ/IAEoAgQhAiABKAIAIQNBCEEEEKsDIgFFBEBBCEEEENUDAAsgASACNgIEIAEgAzYCACAAQezuwAA2AgQgACABNgIACzsCAX8BfCABKAIAQQFxIQIgACsDACEDIAEoAhBBAUYEQCABIAMgAiABQRRqKAIAEDIPCyABIAMgAhBECzkBAX8gAUEQdkAAIQIgAEEANgIIIABBACABQYCAfHEgAkF/RiIBGzYCBCAAQQAgAkEQdCABGzYCAAs5AAJAAn8gAkGAgMQARwRAQQEgACACIAEoAhARAAANARoLIAMNAUEACw8LIAAgAyAEIAEoAgwRAgALLAAjAEEQayICJAAgAiAANgIIIAIgATYCDCACQQhqIAJBDGoQISACQRBqJAALNAEBfyMAQRBrIgIkACACQQhqIAAgARArQQAhASACKAIIRQRAIAAQXSEBCyACQRBqJAAgAQtAAQF/IwBBIGsiACQAIABBHGpBADYCACAAQazfwAA2AhggAEIBNwIMIABBjOLAADYCCCAAQQhqQZTiwAAQ5gIAC0ABAX8jAEEgayIAJAAgAEEcakEANgIAIABBtPjAADYCGCAAQgE3AgwgAEHk+MAANgIIIABBCGpB7PjAABDmAgALPwEBfyMAQSBrIgIkACACQQE6ABggAiABNgIUIAIgADYCECACQfCSwQA2AgwgAkHo+cAANgIIIAJBCGoQywIACyUBAX8jAEEQayICJAAgAiAANgIMIAEgAkEMahDyASACQRBqJAALMwACQCAAQfz///8HSw0AIABFBEBBBA8LIAAgAEH9////B0lBAnQQqwMiAEUNACAADwsACzQBAX8jAEEQayICJAAgAiAAKAIANgIMIAFBkJvAAEENIAJBDGpBoJvAABDrASACQRBqJAALNAEBfyMAQRBrIgIkACACIAAoAgA2AgwgAUGwm8AAQQsgAkEMakGgm8AAEOsBIAJBEGokAAs0AQF/IwBBEGsiAiQAIAIgACgCADYCDCABQbubwABBByACQQxqQaCbwAAQ6wEgAkEQaiQACzQBAX8jAEEQayICJAAgAiAAKAIANgIMIAFBsJ3AAEEJIAJBDGpBvJ3AABDrASACQRBqJAALNAEBfyMAQRBrIgIkACACIAAoAgA2AgwgAUHCm8AAQQYgAkEMakGgm8AAEOsBIAJBEGokAAs3AQF+IAApAgAhAUEUQQQQqwMiAEUEQEEUQQQQ1QMACyAAQgA3AgwgACABNwIEIABBATYCACAACz0BAX8gACgCACEBAkAgAEEEai0AAA0AQYS0wQAoAgBB/////wdxRQ0AEOgDDQAgAUEBOgABCyABQQA6AAALPAEBfyABKAIYQe6UwQBBASABQRxqKAIAKAIMEQIAIQIgAEEBOgAHIABBADsABSAAIAI6AAQgACABNgIACzIAIAAoAgAhACABELIDRQRAIAEQswNFBEAgACABEL0DDwsgACABEP0BDwsgACABEPwBCzIAIAAoAgAhACABELIDRQRAIAEQswNFBEAgACABEIsDDwsgACABEP0BDwsgACABEPwBCysAIwBBEGsiACQAIABBCGogAUG74MAAQQsQ/AIgAEEIahCTAiAAQRBqJAALKwAjAEEQayIAJAAgAEEIaiABQaDswABBCxD8AiAAQQhqEPcBIABBEGokAAs1AQF/QQEhASAALQAEBH8gAQUgACgCACIAQRhqKAIAQdmUwQBBASAAQRxqKAIAKAIMEQIACws1AQF/QQEhASAALQAEBH8gAQUgACgCACIAQRhqKAIAQfCUwQBBASAAQRxqKAIAKAIMEQIACws2ACAAIAEoAhhBuKLAAEEAIAFBHGooAgAoAgwRAgA6AAggACABNgIAIABBAToACSAAQQA2AgQLLQEBfyMAQRBrIgEkACABQQhqIABBCGooAgA2AgAgASAAKQIANwMAIAEQgAMACy0BAX8jAEEQayIBJAAgAUEIaiAAQQhqKAIANgIAIAEgACkCADcDACABEIEDAAstAQF/IwBBEGsiASQAIAFBCGogAEEIaigCADYCACABIAApAgA3AwAgARCAAgALNAAgAEEDOgAgIABCgICAgIAENwIAIAAgATYCGCAAQQA2AhAgAEEANgIIIABBHGogAjYCAAswACABKAIYIAIgAyABQRxqKAIAKAIMEQIAIQIgAEEAOgAFIAAgAjoABCAAIAE2AgALNQEBfyABKAIYQe+UwQBBASABQRxqKAIAKAIMEQIAIQIgAEEAOgAFIAAgAjoABCAAIAE2AgALNQEBfyABKAIYQe6UwQBBASABQRxqKAIAKAIMEQIAIQIgAEEAOgAFIAAgAjoABCAAIAE2AgALLAACQCABELIDRQRAIAEQswMNASAAIAEQvQMPCyAAIAEQ/AEPCyAAIAEQ/QELLgEBfyMAQRBrIgEkACABIAApAgA3AwggAUEIakHooMAAQQAgACgCCEEBEO8BAAsuAQF/IwBBEGsiASQAIAEgACkCADcDCCABQQhqQZTewABBACAAKAIIQQEQ7wEACycAIAAgACgCBEEBcSABckECcjYCBCAAIAFqIgAgACgCBEEBcjYCBAspACAAQoCAgIAQNwIAIABBCGogAUEMaigCACABQQhqKAIAa0EDdjYCAAspACAAQoCAgIAQNwIAIABBCGogAUEMaigCACABQQhqKAIAa0ECdjYCAAsuAQF/IwBBEGsiACQAIABBhKTAADYCCCAAQSI2AgQgAEHgo8AANgIAIAAQ+AIACy4BAX8jAEEQayIAJAAgAEHo3cAANgIIIABBDjYCBCAAQdfdwAA2AgAgABD5AgALIAEBfwJAIAAoAgQiAUUNACAAQQhqKAIARQ0AIAEQHQsLJgEBfyMAQRBrIgMkACADIAE2AgwgAyAANgIIIANBCGogAhDZAgALIwACQCABQfz///8HTQRAIAAgAUEEIAIQoAMiAA0BCwALIAALIwAgAiACKAIEQX5xNgIEIAAgAUEBcjYCBCAAIAFqIAE2AgALHwAgACgCACIArUIAIACsfSAAQX9KIgAbIAAgARCjAQsgAQJ+IAApAwAiAiACQj+HIgOFIAN9IAJCf1UgARCjAQsnACAAKAIALQAARQRAIAFBgK3AAEEKEJwDDwsgAUH5rMAAQQcQnAMLJwAgACgCAC0AAEUEQCABQfWswABBBBCcAw8LIAFB8KzAAEEFEJwDCx4AIAAgAUEDcjYCBCAAIAFqIgAgACgCBEEBcjYCBAsKACAAQQgQ1QMACxQAIABBBGooAgAEQCAAKAIAEB0LCxEAIAAoAgQEQCAAKAIAEB0LCyQAIAAtAABFBEAgAUHWssAAQQoQnAMPCyABQc6ywABBCBCcAwsiACAALQAARQRAIAFBsJrBAEEFECUPCyABQayawQBBBBAlCx0AIAEoAgBFBEAACyAAQYyfwAA2AgQgACABNgIACx0AIAEoAgBFBEAACyAAQajewAA2AgQgACABNgIACxkBAX8gACgCECIBBH8gAQUgAEEUaigCAAsLGAAgACgCACIAKAIAIABBCGooAgAgARApCxIAQQBBGSAAQQF2ayAAQR9GGwsWACAAIAFBAXI2AgQgACABaiABNgIACxwAIAEoAhhBmJLBAEEOIAFBHGooAgAoAgwRAgALGQAgACgCGCABIAIgAEEcaigCACgCDBECAAscACABKAIYQcyswQBBBSABQRxqKAIAKAIMEQIACxcAIABBADYCCCAAIAI2AgQgACABNgIACxAAIAAgAWpBf2pBACABa3ELDAAgACABIAIgAxAvCxcAIABCgICAgBA3AgAgAEEIakEANgIACxMAIABBADYCBCAAIAJBAEc2AgALEwAgACgCACAAQQhqKAIAIAEQKQsWACAAKAIAIgAoAgAgACgCBCABENYDCxQAIAAoAgAgAEEIaigCACABENYDCw8AIABBAXQiAEEAIABrcgsUACAAKAIAIAEgACgCBCgCDBEAAAsSACAAIAEgAhCVASADIAQQxQELDwAgACABIAIgAyAEEBwACxEAIAAoAgAgACgCBCABENYDCwgAIAAgARB6CxAAIAAoAgAgACgCBCABECkLEQAgASAAKAIAIAAoAgQQnAMLEwAgAEHs7sAANgIEIAAgATYCAAsQACAAQgI3AwggAEIBNwMACw0AIAAtAARBAnFBAXYLEAAgASAAKAIAIAAoAgQQJQsNACAALQAAQRBxQQR2Cw0AIAAtAABBIHFBBXYLCgBBACAAayAAcQsLACAALQAEQQNxRQsMACAAIAFBA3I2AgQLDQAgACgCACAAKAIEagsOACAAKAIAIAEQoAFBAAsOACAAKAIAGgNADAALAAsMACAAIAEgAhCjAgALDAAgACABIAIQpAIACwwAIAAgASACEKUCAAsOACAANQIAQQEgARCjAQsMACAAIAEgAhCIAwALCwAgACABIAIQtwELDQAgACgCACABIAIQbwsOACAAKQMAQQEgARCjAQsOACAAKAIAKQMAIAEQbQsMACAAKAIAIAEQkAILDgAgAUHni8AAQQUQnAMLDgAgAUHMi8AAQQoQnAMLDgAgAUHWi8AAQREQnAMLDAAgACgCACABEJQDCw4AIAFB+47AAEEOEJwDCwwAIAAoAgAgARDnAgsMACAAKAIAIAEQ1wELDAAgACgCACABEMIBCw4AIAFB1ZfAAEEREJwDCwwAIAAoAgAgARDkAQsJACAAIAEQAwALDAAgACgCACABELIBCwwAIAAoAgAgARCWAQsKACAAKAIEQXhxCwoAIAAoAgRBAXELCgAgACgCDEEBcQsKACAAKAIMQQF2CxoAIAAgAUH0s8EAKAIAIgBBoQEgABsRAQAACwoAIAIgACABECULDAAgACgCACABEKUBCwsAIAAgASACEPEBCwoAIAAgASACEEALCwAgACABIAIQogELCwAgACABIAIQ0QILDgAgAUHcpMAAQRIQnAMLDgAgAUGQ3sAAQQMQnAMLDgAgAUGN3sAAQQMQnAMLDgAgAUH83cAAQQkQnAMLDgAgAUGF3sAAQQgQnAMLDgAgAUH43cAAQQQQnAMLDgAgAUGwrMAAQRIQnAMLDgAgAUGurcAAQRwQnAMLDgAgAUHKrcAAQQ4QnAMLDgAgAUG8ssAAQRIQnAMLCQAgAEEENgIACwkAIABBBDYCAAsLAEGAuMEAKAIARQsHACAAIAFqCwcAIAAgAWsLBwAgAEEIagsHACAAQXhqCw0AQuuRk7X22LOi9AALDABCyIX5pJ631NsSCwwAQriJz5eJxtH4TAsDAAELC+6vAQwAQYCAwAALyjNpbnRlcm5hbCBlcnJvcjogZW50ZXJlZCB1bnJlYWNoYWJsZSBjb2RlL2hvbWUvYnJpYW4vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9naXRodWIuY29tLTFlY2M2Mjk5ZGI5ZWM4MjMvc2VyZGVfanNvbi0xLjAuODEvc3JjL2RlLnJzACgAEABXAAAASQQAACYAAAAoABAAVwAAAFMEAAAiAAAAAQAAAAAAAAABAAAAAgAAAAEAAAAAAAAAAQAAAAMAAAABAAAAAAAAAAEAAAAEAAAAZ3JhcGhzdHJ1Y3QgUGF0dGVybiB3aXRoIDEgZWxlbWVudAAA1QAQAB0AAAABAAAACAAAAAQAAAAFAAAAZWRnZV9wcm9wZXJ0eWVkZ2Vzbm9kZXNub2RlX2hvbGVzc3RydWN0IERlc2VyR3JhcGggd2l0aCA0IGVsZW1lbnRzAAAtARAAIQAAAHR1cGxlIHZhcmlhbnQgUmVsYXRpb246OldpdGggd2l0aCAyIGVsZW1lbnRzWAEQACwAAAB0dXBsZSB2YXJpYW50AAAAjAEQAA0AAABuZXd0eXBlIHZhcmlhbnQApAEQAA8AAAABAAAAAAAAAAEAAAAGAAAAAQAAAAAAAAABAAAABgAAAAEAAAAAAAAAAQAAAAcAAAABAAAAAAAAAAEAAAAHAAAAAQAAAAAAAAABAAAACAAAAAEAAAAAAAAAAQAAAAkAAAABAAAAAAAAAAEAAAAHAAAAAQAAAAAAAAABAAAACgAAAAEAAAAAAAAAAQAAAAsAAAABAAAAAAAAAAEAAAAMAAAAAQAAAAAAAAABAAAADQAAAAEAAAAAAAAAAQAAAA4AAAABAAAAAAAAAAEAAAAPAAAAAQAAAAAAAAABAAAAEAAAAAEAAAAAAAAAAQAAABEAAAABAAAAAAAAAAEAAAASAAAAAQAAAAAAAAABAAAAEwAAAAEAAAAAAAAAAQAAABQAAAABAAAAAAAAAAEAAAAVAAAAAQAAAAAAAAABAAAAFgAAAHN0cnVjdCBHTUVOb2RlIHdpdGggNiBlbGVtZW50cwAA/AIQAB4AAABpZGlzX2FjdGl2ZWlzX21ldGFhdHRyaWJ1dGVzcG9pbnRlcnNjaGlsZHJlblNldFBvaW50ZXJBdHRyaWJ1dGVOb2RlbWF0Y2hlczAwMDEwMjAzMDQwNTA2MDcwODA5MTAxMTEyMTMxNDE1MTYxNzE4MTkyMDIxMjIyMzI0MjUyNjI3MjgyOTMwMzEzMjMzMzQzNTM2MzczODM5NDA0MTQyNDM0NDQ1NDY0NzQ4NDk1MDUxNTI1MzU0NTU1NjU3NTg1OTYwNjE2MjYzNjQ2NTY2Njc2ODY5NzA3MTcyNzM3NDc1NzY3Nzc4Nzk4MDgxODI4Mzg0ODU4Njg3ODg4OTkwOTE5MjkzOTQ5NTk2OTc5ODk5L2hvbWUvYnJpYW4vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9naXRodWIuY29tLTFlY2M2Mjk5ZGI5ZWM4MjMvcGV0Z3JhcGgtMC42LjIvc3JjL2dyYXBoX2ltcGwvbW9kLnJzAAA2BBAAYAAAALkBAAAYAAAAbm9kZWVkZ2VpbnRlcm5hbCBlcnJvcjogZW50ZXJlZCB1bnJlYWNoYWJsZSBjb2RlL2hvbWUvYnJpYW4vLmNhcmdvL3JlZ2lzdHJ5L3NyYy9naXRodWIuY29tLTFlY2M2Mjk5ZGI5ZWM4MjMvc2VyZGVfanNvbi0xLjAuODEvc3JjL3Nlci5yc9gEEABYAAAAOwYAABIAAADYBBAAWAAAADMIAAA7AAAA2AQQAFgAAAA9CAAANwAAAFx0XHJcblxmXGJcXFwiU3RyaW5nQm9vbGVhbkludGVnZXIAAG4FEAAGAAAAdAUQAAcAAAB7BRAABwAAABoAAAAEAAAABAAAABsAAAAaAAAABAAAAAQAAAAcAAAAGgAAAAQAAAAEAAAAHQAAAGEgc2VxdWVuY2VhIHR1cGxlIG9mIHNpemUgM2EgbWFwHgAAAAAAAAABAAAAAgAAAB4AAAAAAAAAAQAAAAMAAABhIHNlcXVlbmNlAAAMBhAACgAAAB8AAAAEAAAABAAAACAAAAAhAAAAIgAAAEdyYXBoIGNhbiBub3QgaGF2ZSBob2xlcyBpbiB0aGUgZWRnZSBzZXQsIGZvdW5kIE5vbmUsIGV4cGVjdGVkIGVkZ2VHcmFwaCBjYW4gbm90IGhhdmUgaG9sZXMgaW4gdGhlIG5vZGUgc2V0LCBmb3VuZCBub24tZW1wdHkgbm9kZV9ob2xlcwD//////////2lkaXNfYWN0aXZlaXNfbWV0YWF0dHJpYnV0ZXNwb2ludGVyc2NoaWxkcmVuyAYQAAIAAADKBhAACQAAANMGEAAHAAAA2gYQAAoAAADkBhAACAAAAOwGEAAIAAAAJwAAAAQAAAAEAAAAGwAAACcAAAAEAAAABAAAACgAAAAnAAAABAAAAAQAAAApAAAAJwAAAAQAAAAEAAAAKgAAACcAAAAEAAAABAAAACsAAABHTUVOb2Rlc3RydWN0IEdNRU5vZGVub2RlIGRlc2VyaWFsaXphdGlvbiByZXN1bHQgAAAAiQcQABwAAABjYWxsZWQgYFJlc3VsdDo6dW53cmFwKClgIG9uIGFuIGBFcnJgIHZhbHVlACwAAAAEAAAABAAAAC0AAABjcmF0ZXMvZW5naW5lLWpzL3NyYy9saWIucnMA7AcQABsAAABdAAAAGQAAAHBhdHRlcm4gZGVzZXJpYWxpemF0aW9uIHJlc3VsdCAAGAgQAB8AAADsBxAAGwAAAGAAAAATAAAAbm9kZQo7CnBhdHRlcm4KAFAIEAAFAAAAVQgQAAoAAADsBxAAGwAAAGQAAAAFAAAAQWN0aXZlTm9kZUFueU5vZGUAAACACBAACgAAAIoIEAAHAAAATm9kZUNvbnN0YW50QXR0cmlidXRlUG9pbnRlcqQIEAAEAAAAqAgQAAgAAACwCBAACQAAALkIEAAHAAAAZ3JhcGhQcmltaXRpdmUAAOUIEAAJAAAApAgQAAQAAABOYW1lVmFsdWUAAAAACRAABAAAAAQJEAAFAAAAQ2hpbGRPZkhhc1dpdGhFcXVhbAAcCRAABwAAACMJEAADAAAAJgkQAAQAAAAqCRAABQAAADEAAAAMAAAABAAAADIAAAAzAAAANAAAAGEgRGlzcGxheSBpbXBsZW1lbnRhdGlvbiByZXR1cm5lZCBhbiBlcnJvciB1bmV4cGVjdGVkbHkANQAAAAAAAAABAAAANgAAAC9ydXN0Yy84OTdlMzc1NTNiYmE4YjQyNzUxYzY3NjU4OTY3ODg5ZDExZWNkMTIwL2xpYnJhcnkvYWxsb2Mvc3JjL3N0cmluZy5ycwCwCRAASwAAAM4JAAAJAAAAaW52YWxpZCB2YWx1ZTogLCBleHBlY3RlZCAAAAwKEAAPAAAAGwoQAAsAAABtaXNzaW5nIGZpZWxkIGBgOAoQAA8AAABHChAAAQAAAGludmFsaWQgbGVuZ3RoIABYChAADwAAABsKEAALAAAAZHVwbGljYXRlIGZpZWxkIGAAAAB4ChAAEQAAAEcKEAABAAAAdW5rbm93biB2YXJpYW50IGBgLCBleHBlY3RlZCAAAACcChAAEQAAAK0KEAAMAAAAYCwgdGhlcmUgYXJlIG5vIHZhcmlhbnRznAoQABEAAADMChAAGAAAAEVycgA1AAAABAAAAAQAAAA3AAAAT2sAADUAAAAEAAAABAAAACUAAAA1AAAABAAAAAQAAAAdAAAAAAAAAP//////////U29tZU5vbmU4AAAABAAAAAQAAAA5AAAAZ3JhcGggZWRnZSBwcm9wZXJ0eSBtaXNtYXRjaCwgZXhwZWN0ZWQgLCBmb3VuZCAAUAsQACcAAAB3CxAACAAAAHVuZGlyZWN0ZWRkaXJlY3RlZAAAkAsQAAoAAACaCxAACAAAAG5vZGVzbm9kZV9ob2xlc2VkZ2VfcHJvcGVydHllZGdlc3N0cnVjdCBEZXNlckdyYXBoaW52YWxpZCB2YWx1ZTogbm9kZSBpbmRleCBgYCBkb2VzIG5vdCBleGlzdCBpbiBncmFwaCB3aXRoIG5vZGUgYm91bmQgAOYLEAAbAAAAAQwQACoAAABpbnZhbGlkIHNpemU6IGdyYXBoICBjb3VudCAgZXhjZWVkcyBpbmRleCB0eXBlIG1heGltdW0gADwMEAAUAAAAUAwQAAcAAABXDBAAHAAAAC9ydXN0Yy84OTdlMzc1NTNiYmE4YjQyNzUxYzY3NjU4OTY3ODg5ZDEx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PL9zf91PFXULr1Df1KNKdWdtkgtlpoB1wAh3Tv7PtHXxyhTi/QPqddb+TK1+QiB2jD6gWB5TVHYvTsju5WeJdrthemrfwb92FX2MoivZ83ZanC+Lds8od3CD+y1UA193JjK9nBRik3ewfuzDmTrId1ye5zRASf53+cIQIcjtMni481QpOqlneKUwqrOIk514Z15KcDV80ngB9lzMQhsHeYIzdH8T4jx5MaCoL0wNcnk9yJI7n5CmeU16dwrHNNx5cKyKZvygEXqMVy2AOwlGem+tOGCKi3t6ZWwjfDY3sXp/RywbBIXlel5Z9yFF5hp725c6NevPUHvSPYkC5gOFe0aNK4PfRLp7TDj7sQtr8HtfBnqezoUkfPaHGEZCp1l8+lTPa4kIkHw4KsPGqwrEfMf0c7hWDfl8+PGQZqxQL307lxrAa5JjfQo9IbAGd5h9TIwpXMiUzn2w95k5/RwDfpx1AIg85Dd+A5MAqkvdbX7iW0BKT6qiftpy0BzjVNd+kI8E5BsqDX+62YJuUTpCfymQI8rlyHZ/M3SsPB97rH+gyOuF88zhfy9ob21lL2JyaWFuLy5jYXJnby9yZWdpc3RyeS9zcmMvZ2l0aHViLmNvbS0xZWNjNjI5OWRiOWVjODIzL3NlcmRlX2pzb24tMS4wLjgxL3NyYy9yZWFkLnJzAAAAeCMQAFkAAAChAQAAFAAAAHgjEABZAAAAxgEAABMAAAB4IxAAWQAAANUBAAAwAAAAeCMQAFkAAADLAQAAKQAAAHgjEABZAAAAzwEAADQAAAB4IxAAWQAAACYCAAATAAAAeCMQAFkAAAA+AgAAJQAAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAABAEGgycAACwEBAEHEysAAC58NY2FsbGVkIGBPcHRpb246OnVud3JhcCgpYCBvbiBhIGBOb25lYCB2YWx1ZQB4IxAAWQAAAKYDAAAWAAAA////////////////////////////////////////////////////////////////AAECAwQFBgcICf////////8KCwwNDg///////////////////////////////////woLDA0OD////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////1RyaWVkIHRvIHNocmluayB0byBhIGxhcmdlciBjYXBhY2l0eYAmEAAkAAAAL3J1c3RjLzg5N2UzNzU1M2JiYThiNDI3NTFjNjc2NTg5Njc4ODlkMTFlY2QxMjAvbGlicmFyeS9hbGxvYy9zcmMvcmF3X3ZlYy5yc6wmEABMAAAAqgEAAAkAAACHAAAADAAAAAQAAACIAAAAiQAAAIoAAABhIERpc3BsYXkgaW1wbGVtZW50YXRpb24gcmV0dXJuZWQgYW4gZXJyb3IgdW5leHBlY3RlZGx5AIsAAAAAAAAAAQAAADYAAAAvcnVzdGMvODk3ZTM3NTUzYmJhOGI0Mjc1MWM2NzY1ODk2Nzg4OWQxMWVjZDEyMC9saWJyYXJ5L2FsbG9jL3NyYy9zdHJpbmcucnMAaCcQAEsAAADOCQAACQAAAC9ydXN0Yy84OTdlMzc1NTNiYmE4YjQyNzUxYzY3NjU4OTY3ODg5ZDExZWNkMTIwL2xpYnJhcnkvY29yZS9zcmMvc3RyL3BhdHRlcm4ucnMAxCcQAE8AAADjBQAAFAAAAMQnEABPAAAA4wUAACEAAADEJxAATwAAAO8FAAAUAAAAxCcQAE8AAADvBQAAIQAAAGFzc2VydGlvbiBmYWlsZWQ6IHNlbGYuaXNfY2hhcl9ib3VuZGFyeShuZXdfbGVuKWgnEABLAAAAAAUAAA0AAADEJxAATwAAAHAEAAAXAAAAcmVjdXJzaW9uIGxpbWl0IGV4Y2VlZGVkdW5leHBlY3RlZCBlbmQgb2YgaGV4IGVzY2FwZXRyYWlsaW5nIGNoYXJhY3RlcnN0cmFpbGluZyBjb21tYWxvbmUgbGVhZGluZyBzdXJyb2dhdGUgaW4gaGV4IGVzY2FwZWtleSBtdXN0IGJlIGEgc3RyaW5nY29udHJvbCBjaGFyYWN0ZXIgKFx1MDAwMC1cdTAwMUYpIGZvdW5kIHdoaWxlIHBhcnNpbmcgYSBzdHJpbmdpbnZhbGlkIHVuaWNvZGUgY29kZSBwb2ludG51bWJlciBvdXQgb2YgcmFuZ2VpbnZhbGlkIG51bWJlcmludmFsaWQgZXNjYXBlZXhwZWN0ZWQgdmFsdWVleHBlY3RlZCBpZGVudGV4cGVjdGVkIGAsYCBvciBgfWBleHBlY3RlZCBgLGAgb3IgYF1gZXhwZWN0ZWQgYDpgRU9GIHdoaWxlIHBhcnNpbmcgYSB2YWx1ZUVPRiB3aGlsZSBwYXJzaW5nIGEgc3RyaW5nRU9GIHdoaWxlIHBhcnNpbmcgYW4gb2JqZWN0RU9GIHdoaWxlIHBhcnNpbmcgYSBsaXN0IGF0IGxpbmUgRXJyb3IoLCBsaW5lOiAsIGNvbHVtbjogKQAAdSoQAAYAAAB7KhAACAAAAIMqEAAKAAAAjSoQAAEAAABpbnZhbGlkIHR5cGU6ICwgZXhwZWN0ZWQgAAAAsCoQAA4AAAC+KhAACwAAAGludmFsaWQgdHlwZTogbnVsbCwgZXhwZWN0ZWQgAAAA3CoQAB0AAAAvaG9tZS9icmlhbi8uY2FyZ28vcmVnaXN0cnkvc3JjL2dpdGh1Yi5jb20tMWVjYzYyOTlkYjllYzgyMy9zZXJkZV9qc29uLTEuMC44MS9zcmMvZXJyb3IucnMAAAQrEABaAAAAlwEAAB4AAAAEKxAAWgAAAJsBAAAJAAAABCsQAFoAAACiAQAAHgAAAAQrEABaAAAAqwEAACcAAAAEKxAAWgAAAK8BAAApAAAAMDEyMzQ1Njc4OWFiY2RlZnV1dXV1dXV1YnRudWZydXV1dXV1dXV1dXV1dXV1dXV1AAAiAEGc2MAACwFcAEHA2cAAC+4hjAAAAAQAAAAEAAAAjQAAAI4AAACPAAAAc3RydWN0IHZhcmlhbnQAANgsEAAOAAAAdHVwbGUgdmFyaWFudAAAAPAsEAANAAAAbmV3dHlwZSB2YXJpYW50AAgtEAAPAAAAdW5pdCB2YXJpYW50IC0QAAwAAABlbnVtNC0QAAQAAABtYXAAQC0QAAMAAABzZXF1ZW5jZUwtEAAIAAAAbmV3dHlwZSBzdHJ1Y3QAAFwtEAAOAAAAT3B0aW9uIHZhbHVldC0QAAwAAAB1bml0IHZhbHVlAACILRAACgAAAGJ5dGUgYXJyYXkAAJwtEAAKAAAAc3RyaW5nIACwLRAABwAAAGNoYXJhY3RlciBgYMAtEAALAAAAyy0QAAEAAABmbG9hdGluZyBwb2ludCBg3C0QABAAAADLLRAAAQAAAGludGVnZXIgYAAAAPwtEAAJAAAAyy0QAAEAAABib29sZWFuIGAAAAAYLhAACQAAAMstEAABAAAAb25lIG9mIAA0LhAABwAAACwgAABELhAAAgAAAMstEAABAAAAyy0QAAEAAABgIG9yIGAAAMstEAABAAAAYC4QAAYAAADLLRAAAQAAAC9ob21lL2JyaWFuLy5jYXJnby9yZWdpc3RyeS9zcmMvZ2l0aHViLmNvbS0xZWNjNjI5OWRiOWVjODIzL3NlcmRlLTEuMC4xMzcvc3JjL2RlL21vZC5yc2V4cGxpY2l0IHBhbmljAAAAgC4QAFcAAADoCAAAEgAAAHVuaXRhIGJvb2xlYW5hIHN0cmluZ2kzMnUzMgCYAAAACAAAAAQAAACZAAAAmgAAAJsAAAAIAAAABAAAAJwAAABjYWxsZWQgYFJlc3VsdDo6dW53cmFwKClgIG9uIGFuIGBFcnJgIHZhbHVlAKIAAAAEAAAABAAAAKMAAACkAAAApQAAAKIAAAAEAAAABAAAAKYAAACnAAAAqAAAAKIAAAAEAAAABAAAAKkAAACqAAAAqwAAAGFscmVhZHkgYm9ycm93ZWSiAAAAAAAAAAEAAABeAAAAYXNzZXJ0aW9uIGZhaWxlZDogbWlkIDw9IHNlbGYubGVuKCkAogAAAAQAAAAEAAAArAAAAKIAAAAEAAAABAAAAK0AAABjYWxsZWQgYE9wdGlvbjo6dW53cmFwKClgIG9uIGEgYE5vbmVgIHZhbHVlQWNjZXNzRXJyb3J1c2Ugb2Ygc3RkOjp0aHJlYWQ6OmN1cnJlbnQoKSBpcyBub3QgcG9zc2libGUgYWZ0ZXIgdGhlIHRocmVhZCdzIGxvY2FsIGRhdGEgaGFzIGJlZW4gZGVzdHJveWVkbGlicmFyeS9zdGQvc3JjL3RocmVhZC9tb2QucnMAAACkMBAAHQAAALICAAAFAAAAZmFpbGVkIHRvIGdlbmVyYXRlIHVuaXF1ZSB0aHJlYWQgSUQ6IGJpdHNwYWNlIGV4aGF1c3RlZADUMBAANwAAAKQwEAAdAAAAFwQAAA0AAACsLxAAAAAAAGxpYnJhcnkvc3RkL3NyYy9pby9idWZmZXJlZC9saW5ld3JpdGVyc2hpbS5ycwAAACwxEAAtAAAAAQEAACkAAAB1bmNhdGVnb3JpemVkIGVycm9yb3RoZXIgZXJyb3JvdXQgb2YgbWVtb3J5dW5leHBlY3RlZCBlbmQgb2YgZmlsZXVuc3VwcG9ydGVkb3BlcmF0aW9uIGludGVycnVwdGVkYXJndW1lbnQgbGlzdCB0b28gbG9uZ2ludmFsaWQgZmlsZW5hbWV0b28gbWFueSBsaW5rc2Nyb3NzLWRldmljZSBsaW5rIG9yIHJlbmFtZWRlYWRsb2NrZXhlY3V0YWJsZSBmaWxlIGJ1c3lyZXNvdXJjZSBidXN5ZmlsZSB0b28gbGFyZ2VmaWxlc3lzdGVtIHF1b3RhIGV4Y2VlZGVkc2VlayBvbiB1bnNlZWthYmxlIGZpbGVubyBzdG9yYWdlIHNwYWNld3JpdGUgemVyb3RpbWVkIG91dGludmFsaWQgZGF0YWludmFsaWQgaW5wdXQgcGFyYW1ldGVyc3RhbGUgbmV0d29yayBmaWxlIGhhbmRsZWZpbGVzeXN0ZW0gbG9vcCBvciBpbmRpcmVjdGlvbiBsaW1pdCAoZS5nLiBzeW1saW5rIGxvb3ApcmVhZC1vbmx5IGZpbGVzeXN0ZW0gb3Igc3RvcmFnZSBtZWRpdW1kaXJlY3Rvcnkgbm90IGVtcHR5aXMgYSBkaXJlY3Rvcnlub3QgYSBkaXJlY3RvcnlvcGVyYXRpb24gd291bGQgYmxvY2tlbnRpdHkgYWxyZWFkeSBleGlzdHNicm9rZW4gcGlwZW5ldHdvcmsgZG93bmFkZHJlc3Mgbm90IGF2YWlsYWJsZWFkZHJlc3MgaW4gdXNlbm90IGNvbm5lY3RlZGNvbm5lY3Rpb24gYWJvcnRlZG5ldHdvcmsgdW5yZWFjaGFibGVob3N0IHVucmVhY2hhYmxlY29ubmVjdGlvbiByZXNldGNvbm5lY3Rpb24gcmVmdXNlZHBlcm1pc3Npb24gZGVuaWVkZW50aXR5IG5vdCBmb3VuZCAob3MgZXJyb3IgKQAAAKwvEAAAAAAAWTQQAAsAAABkNBAAAQAAAGxpYnJhcnkvc3RkL3NyYy9pby9zdGRpby5ycwCANBAAGwAAAN8CAAAUAAAAZmFpbGVkIHByaW50aW5nIHRvIDogAAAArDQQABMAAAC/NBAAAgAAAIA0EAAbAAAA+gMAAAkAAABzdGRvdXRmb3JtYXR0ZXIgZXJyb3IAAADqNBAADwAAACgAAACuAAAADAAAAAQAAACvAAAAsAAAALEAAACuAAAADAAAAAQAAACyAAAAswAAALQAAABsaWJyYXJ5L3N0ZC9zcmMvc3luYy9vbmNlLnJzODUQABwAAABOAQAADgAAAKIAAAAEAAAABAAAALUAAAC2AAAAODUQABwAAABOAQAAKAAAAGFzc2VydGlvbiBmYWlsZWQ6IHN0YXRlX2FuZF9xdWV1ZS5hZGRyKCkgJiBTVEFURV9NQVNLID09IFJVTk5JTkdPbmNlIGluc3RhbmNlIGhhcyBwcmV2aW91c2x5IGJlZW4gcG9pc29uZWQAAMg1EAAqAAAAAgAAADg1EAAcAAAA/wEAAAkAAAA4NRAAHAAAAAwCAAAeAAAAUG9pc29uRXJyb3Jsb2NrIGNvdW50IG92ZXJmbG93IGluIHJlZW50cmFudCBtdXRleGxpYnJhcnkvc3RkL3NyYy9zeXNfY29tbW9uL3JlbXV0ZXgucnMAAFE2EAAlAAAAjwAAACIAAABsaWJyYXJ5L3N0ZC9zcmMvc3lzX2NvbW1vbi90aHJlYWRfaW5mby5ycwAAAIg2EAApAAAAFgAAADMAAABtZW1vcnkgYWxsb2NhdGlvbiBvZiAgYnl0ZXMgZmFpbGVkCgDENhAAFQAAANk2EAAOAAAAbGlicmFyeS9zdGQvc3JjL2FsbG9jLnJz+DYQABgAAABVAQAACQAAAGxpYnJhcnkvc3RkL3NyYy9wYW5pY2tpbmcucnMgNxAAHAAAAEcCAAAPAAAAIDcQABwAAABGAgAADwAAALcAAAAMAAAABAAAALgAAACiAAAACAAAAAQAAAC5AAAAugAAABAAAAAEAAAAuwAAALwAAACiAAAACAAAAAQAAAC9AAAAvgAAAG9wZXJhdGlvbiBzdWNjZXNzZnVsY29uZHZhciB3YWl0IG5vdCBzdXBwb3J0ZWQAALg3EAAaAAAAbGlicmFyeS9zdGQvc3JjL3N5cy93YXNtLy4uL3Vuc3VwcG9ydGVkL2xvY2tzL2NvbmR2YXIucnPcNxAAOAAAABUAAAAJAAAAAGNhbm5vdCByZWN1cnNpdmVseSBhY3F1aXJlIG11dGV4AAAAJTgQACAAAABsaWJyYXJ5L3N0ZC9zcmMvc3lzL3dhc20vLi4vdW5zdXBwb3J0ZWQvbG9ja3Mv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",
		          );
		        }
		      }
		      Q.ffi = I;
		      const C = Q;
		    })(),
		      B = B.default;
		  })();
		});
	} (engine));

	var engineModule = engineExports;

	let enginePromise;
	function getEngine() {
	    if (!enginePromise) {
	        enginePromise = engineModule.create();
	    }
	    return enginePromise;
	}
	class Transformation {
	    constructor(core, steps) {
	        this.core = core;
	        this.steps = steps;
	        // TODO: We may want to create an interface to use with the core (like Umesh mentioned a while ago) so
	        // this can create WJI or GME nodes. Technically, WJI can be imported but this has decent perf overhead.
	        // First, we should just see if we can optimize WJI
	    }
	    async apply(activeNode) {
	        const node = await GMENode.fromNode(this.core, activeNode);
	        node.setActiveNode();
	        const createdNodes = {};
	        const newNodes = await this.steps.reduce(async (refDataP, step) => {
	            const refData = await refDataP;
	            const matchOutputs = await step.apply(node, activeNode, createdNodes);
	            return refData.concat(...matchOutputs);
	        }, Promise.resolve([]));
	        return this._toTree(newNodes);
	    }
	    _toTree(nodes) {
	        const [roots, children] = partition(nodes, (node) => !node.parent);
	        children.forEach((child) => {
	            child.parent.children.push(child);
	            delete child.parent;
	        });
	        return roots;
	    }
	    // TODO: for each assignment:
	    // TODO: create the output pattern using the assignment values
	    // TODO: sort the elements -> (parent) nodes -> attributes/pointers/etc
	    static async fromNode(core, node) {
	        const stepNodes = sortNodeList(core, await core.loadChildren(node), "next");
	        console.log("steps:", stepNodes.map((c) => [core.getPath(c), core.getAttribute(c, "name")]));
	        const steps = await Promise.all(stepNodes.map((step) => TransformationStep.fromNode(core, step)));
	        return new Transformation(core, steps);
	    }
	}
	function sortNodeList(core, nodes, ptr) {
	    const nodeDict = Object.fromEntries(nodes.map((n) => [core.getPath(n), n]));
	    const start = nodes.find((node) => {
	        const nodePath = core.getPath(node);
	        const predecessor = nodes.find((p) => core.getPointerPath(p, ptr) === nodePath);
	        return !predecessor;
	    });
	    const list = [];
	    let node = start;
	    while (node) {
	        if (list.includes(node)) {
	            throw new Error("Transformation steps have a cycle!");
	        }
	        list.push(node);
	        const nextPath = core.getPointerPath(node, ptr);
	        node = nodeDict[nextPath];
	    }
	    return list;
	}
	class TransformationStep {
	    constructor(name, core, pattern, outputPattern) {
	        this.name = name;
	        this.core = core;
	        this.pattern = pattern;
	        this.pattern.ensureCanMatch();
	        this.outputPattern = outputPattern;
	    }
	    async apply(node, gmeNode, createdNodes = {}) {
	        console.log("---> applying step", this.name);
	        const matches = await this.pattern.matches(node);
	        const outputs = await Promise.all(matches.map((match, index) => this.outputPattern.instantiate(this.core, gmeNode, match, createdNodes, index.toString())));
	        return outputs;
	    }
	    static async fromNode(core, node) {
	        const children = await core.loadChildren(node);
	        const inputNode = children.find((child) => core.getAttribute(child, "name").toString().includes("Input"));
	        const outputNode = children.find((child) => core.getAttribute(child, "name").toString().includes("Output"));
	        const [inputPattern, outputPattern] = await Promise.all([
	            Pattern.fromNode(core, inputNode),
	            Pattern.fromNode(core, outputNode),
	        ]);
	        console.log("input node path:", core.getPath(inputNode));
	        const name = core.getAttribute(node, "name").toString();
	        return new TransformationStep(name, core, inputPattern, outputPattern);
	    }
	}
	class Pattern {
	    constructor() {
	        this.graph = new Graph();
	        this.externalRelations = [];
	        this.nodePaths = {};
	    }
	    async matches(node) {
	        const engine = await getEngine();
	        this.ensureCanMatch();
	        const assignments = engine.find_matches(node, this.toEngineJSON());
	        return assignments.map((a) => mapKeys(a.matches, (k) => this.nodePaths[k]));
	    }
	    ensureCanMatch() {
	        const elements = this.getElements();
	        const matchedNode = elements.find((element) => element.type instanceof MatchedNode);
	        assert(!matchedNode, new Error("Matched nodes cannot be in input patterns: " +
	            JSON.stringify(matchedNode)));
	    }
	    toEngineJSON() {
	        const graph = this.graph.toEngineJSON();
	        return { graph };
	    }
	    addElement(node, nodePath) {
	        const index = this.graph.addNode(node);
	        nodePath.map(nodePath => this.nodePaths[index] = nodePath);
	        return index;
	    }
	    getElements() {
	        return this.graph.nodes.slice();
	    }
	    addRelation(srcIndex, dstIndex, relation) {
	        return this.graph.addEdge(srcIndex, dstIndex, relation);
	    }
	    addCrossPatternRelation(src, dst, relation) {
	        this.externalRelations.push([src, dst, relation]);
	    }
	    getRelationsWith(index) {
	        const edges = this.graph.getEdges(index);
	        this.externalRelations.forEach(([src, dst, relation]) => {
	            if (src === index) {
	                edges[0].push([src, dst, relation]);
	            }
	            if (dst === index) {
	                edges[1].push([src, dst, relation]);
	            }
	        });
	        return edges;
	    }
	    getAllRelations() {
	        return this.graph.edges.concat(this.externalRelations);
	    }
	    async instantiate(core, node, assignments, createdNodes, idPrefix = "node") {
	        const elements = this.getElements().map((element, i) => [element, i]);
	        const [nodeElements, otherElements] = partition(elements, ([e]) => e.type.isNode());
	        const nodeIdFor = (index) => `@id:${idPrefix}_${index}`;
	        const [matchedNodeElements, otherNodeElements] = partition(nodeElements, ([element]) => element.type instanceof MatchedNode);
	        const matchedNodes = matchedNodeElements
	            .map(([element, index]) => {
	            // Resolving matched nodes is a little involved. We need to:
	            //   - find the input element being referenced
	            //   - resolve it to the match from the assignments
	            //   - look up the createdNode corresponding to that match
	            const inputElementPath = element.type.matchPath;
	            const modelElement = assignments[inputElementPath];
	            const nodePath = modelElement.Node;
	            assert(!!createdNodes[nodePath], new NoMatchedNodeError(nodePath));
	            return [createdNodes[nodePath], index];
	        });
	        const newNodesStep = {};
	        const newNodes = otherNodeElements.map(([element, index]) => {
	            const node = new JsonNode(nodeIdFor(index));
	            console.log('making new node for', element, node);
	            if (assignments[element.originPath]) {
	                const assignedElement = assignments[element.originPath];
	                assert(!!assignedElement.Node, new UnimplementedError("Referencing non-Node origins"));
	                const nodePath = assignedElement.Node;
	                createdNodes[nodePath] = node;
	            }
	            if (element.nodePath) {
	                newNodesStep[element.nodePath] = node;
	            }
	            return [node, index];
	        });
	        const nodes = newNodes.concat(matchedNodes);
	        const getNodeAt = (index) => {
	            const nodePair = nodes.find(([_n, i]) => i === index);
	            assert(!!nodePair);
	            return nodePair[0];
	        };
	        const updateElements = otherElements.filter(([e]) => !e.type.isConstant());
	        await updateElements.reduce(async (prev, [element, index]) => {
	            await prev;
	            const [outEdges, inEdges] = this.getRelationsWith(index);
	            if (element.type instanceof Attribute || element.type instanceof Pointer) {
	                const [[hasEdge], otherEdges] = partition(inEdges, ([_src, _dst, relation]) => relation instanceof Relation.Has);
	                assert(!!hasEdge, new MissingRelation(element.nodePath, new Relation.Has()));
	                // TODO: Check that there is only a single Has edge
	                const nodeWJI = getNodeAt(hasEdge[0]);
	                // Get the name/value information for With edges
	                const [nameTuple, valueTuple] = getNameValueTupleFor(index, otherEdges.concat(outEdges));
	                const rootNode = core.getRoot(node);
	                const name = await this.resolveNodeProperty(core, rootNode, assignments, newNodesStep, ...nameTuple);
	                // TODO: make sure this works for Equal edges, too
	                const targetPath = await this.resolveNodeProperty(core, rootNode, assignments, newNodesStep, ...valueTuple);
	                const field = element.type instanceof Attribute ? "attributes" : "pointers";
	                nodeWJI[field][name] = targetPath;
	            }
	            else {
	                throw new Error(`Unsupported element to instantiate: ${JSON.stringify(element)}`);
	            }
	        }, Promise.resolve());
	        // add child of relations
	        this.getAllRelations()
	            .filter(([_src, _dst, relation]) => relation instanceof Relation.ChildOf)
	            .forEach(([src, dst]) => {
	            const dstNode = getNodeAt(dst);
	            const srcNode = getNodeAt(src);
	            // FIXME: some parents are not being set...
	            // Maybe they are the ones referencing another node tin the output pattern ?
	            srcNode.parent = dstNode;
	        });
	        return newNodes.map(([node, _index]) => node);
	    }
	    async resolveNodeProperty(core, rootNode, assignments, newNodesStep, // nodes created for elements in the output pattern
	    indexOrNodePath, property) {
	        const isNodePath = typeof indexOrNodePath === "string";
	        if (isNodePath) { // FIXME: does this only happen if it is in the input pattern?
	            const node = await core.loadByPath(rootNode, indexOrNodePath);
	            const elementNode = Pattern.getPatternChild(core, node);
	            const elementType = core.getAttribute(core.getBaseType(elementNode), "name").toString();
	            const elementPath = core.getPath(elementNode);
	            if (elementType === "Constant") {
	                return core.getAttribute(elementNode, "value");
	            }
	            else if (elementType.includes("Node")) {
	                return assignments[elementPath].Node; // FIXME: I believe this is incorrect
	            }
	            else if (elementType === "Attribute") {
	                const [nodeId, attrName] = assignments[elementPath].Attribute;
	                if (property === Property.Name) {
	                    return attrName;
	                }
	                else {
	                    const targetNode = await core.loadByPath(rootNode, nodeId);
	                    return core.getAttribute(targetNode, attrName);
	                }
	            }
	            else ;
	            // TODO: resolve the match?
	            // TODO: convert it to an element?
	            if (property === Property.Name) {
	                return elementPath;
	            }
	        }
	        else {
	            const element = this.getElements()[indexOrNodePath];
	            if (element.type instanceof Constant) {
	                return element.type.value;
	            }
	            else if (element.type instanceof NodeConstant) {
	                return element.type.path;
	            }
	            else if (newNodesStep[element.nodePath]) { // referencing another output element
	                return newNodesStep[element.nodePath].id;
	            }
	            else {
	                assert(false, new Error(`Unknown element type`));
	            }
	        }
	    }
	    static async fromNode(core, patternNode) {
	        const relationType = Object.values(core.getAllMetaNodes(patternNode))
	            .find((node) => core.getAttribute(node, "name") === "Relation");
	        const isRelation = (node) => core.isTypeOf(node, relationType);
	        const elementNodes = (await core.loadChildren(patternNode))
	            .sort((n1, n2) => {
	            if (isRelation(n1))
	                return 1;
	            if (isRelation(n2))
	                return -1;
	            // This next bit is an unfortunate workaround for now. The upcoming logic
	            // for handling relations assumes that there is a 1:1 mapping btwn nodes
	            // and the pattern elements they resolve to. However, this isn't the case
	            // for the "Node" type since it specifies a base pointer. This is shorthand
	            // for "AnyNode" with a pointer set
	            // FIXME: Splice the elements instead to make sure the indices are correct
	            const metaType1 = core.getAttribute(core.getBaseType(n1), "name");
	            if (metaType1 === "Node")
	                return 1;
	            const metaType2 = core.getAttribute(core.getBaseType(n2), "name");
	            if (metaType2 === "Node")
	                return -1;
	            return 0;
	        });
	        const pattern = new Pattern();
	        await elementNodes.reduce(async (prev, node) => {
	            await prev;
	            const nodePath = core.getPath(node);
	            if (!isRelation(node)) {
	                let metaType = core.getAttribute(core.getBaseType(node), "name").toString();
	                if (metaType === "Node") { // Short-hand for AnyNode with a base pointer
	                    const originPath = core.getPointerPath(node, "origin");
	                    const baseId = core.getPointerPath(node, "type");
	                    const nodeElement = new Element(new AnyNode(), nodePath, originPath);
	                    const pointer = new Element(new Pointer());
	                    const ptrName = new Element(new Constant("base"));
	                    const base = new Element(new NodeConstant(baseId));
	                    const nodeIndex = pattern.addElement(nodeElement, dist.Some(core.getPath(node))); // need to add this element first
	                    const ptrIndex = pattern.addElement(pointer, dist.None);
	                    const ptrNameIndex = pattern.addElement(ptrName, dist.None);
	                    const baseIndex = pattern.addElement(base, dist.None);
	                    pattern.addRelation(nodeIndex, ptrIndex, new Relation.Has());
	                    pattern.addRelation(ptrIndex, ptrNameIndex, new Relation.With(Property.Name, Property.Value));
	                    pattern.addRelation(ptrIndex, baseIndex, new Relation.With(Property.Value, Property.Value));
	                }
	                else {
	                    const element = Pattern.getElementForNode(core, node, metaType);
	                    const nodePath = core.getPath(node);
	                    pattern.addElement(element, dist.Some(nodePath));
	                }
	            }
	            else {
	                const srcPath = core.getPointerPath(node, "src");
	                const dstPath = core.getPointerPath(node, "dst");
	                const elements = pattern.getElements();
	                const srcElementIndex = elements.findIndex(element => srcPath.startsWith(element.nodePath));
	                const dstElementIndex = elements.findIndex(element => dstPath.startsWith(element.nodePath));
	                const srcElement = elements[srcElementIndex];
	                const dstElement = elements[dstElementIndex];
	                const src = await Endpoint.from(core, patternNode, srcPath, srcElement);
	                const dst = await Endpoint.from(core, patternNode, dstPath, dstElement);
	                const relation = Pattern.getRelationElementForNode(core, node, src, dst);
	                if (srcElementIndex !== -1 && dstElementIndex !== -1) {
	                    pattern.addRelation(srcElementIndex, dstElementIndex, relation);
	                }
	                else {
	                    const src = srcElementIndex === -1 ? srcPath : srcElementIndex;
	                    const dst = dstElementIndex === -1 ? dstPath : dstElementIndex;
	                    pattern.addCrossPatternRelation(src, dst, relation);
	                }
	            }
	        }, Promise.resolve());
	        return pattern;
	    }
	    static getPatternChild(core, node) {
	        let child = node;
	        const isPatternType = (n) => {
	            const metaType = core.getAttribute(core.getBaseType(n), "name").toString();
	            return metaType.includes("Pattern") || metaType.includes("Structure");
	        };
	        while (child && !isPatternType(core.getParent(child))) {
	            child = core.getParent(child);
	        }
	        return child;
	    }
	    static getElementForNode(core, node, metaType) {
	        const type = Pattern.getElementTypeForNode(core, node, metaType);
	        const nodePath = core.getPath(node);
	        const originPath = core.getPointerPath(node, "origin");
	        // FIXME: this should be the origin target -> not the node path
	        return new Element(type, nodePath, originPath);
	    }
	    static getElementTypeForNode(core, node, metaType) {
	        switch (metaType) {
	            case "ActiveNode":
	                return new ActiveNode();
	            case "AnyNode":
	                return new AnyNode();
	            case "Attribute":
	                return new Attribute();
	            case "Constant":
	                const value = core.getAttribute(node, "value");
	                return new Constant(value);
	            case "MatchedNode":
	                const matchPath = core.getPointerPath(node, "match");
	                return new MatchedNode(matchPath);
	            //case "ExistingNode":
	            //// TODO:
	            //const id = core.getPath(node);
	            //return new NodeConstant(id);
	            case "Pointer":
	                return new Pointer();
	            default:
	                throw new Error(`Unknown element type: ${metaType}`);
	        }
	    }
	    static getRelationElementForNode(core, node, source, target) {
	        const metaType = core.getAttribute(core.getBaseType(node), "name");
	        switch (metaType) {
	            case "has":
	                return new Relation.Has();
	            case "with":
	                const srcProperty = source.getProperty();
	                const dstProperty = target.getProperty();
	                return new Relation.With(srcProperty, dstProperty);
	            case "child of":
	                return new Relation.ChildOf();
	            case "equal nodes":
	                // Set a node property to another node.
	                return new Relation.With(Property.Value, Property.Value);
	            default:
	                throw new Error(`Unknown relation type: ${metaType}`);
	        }
	    }
	}
	class Graph {
	    constructor() {
	        this.nodes = [];
	        this.edges = [];
	        // The next fields are needed to deserialize properly to petgraph in rust
	        this.node_holes = [];
	        this.edge_property = "directed";
	    }
	    addNode(node) {
	        this.nodes.push(node);
	        return this.nodes.length - 1;
	    }
	    addEdge(srcIndex, dstIndex, weight) {
	        this.edges.push([srcIndex, dstIndex, weight]);
	    }
	    getEdges(index) {
	        const edges = [[], []];
	        this.edges.forEach((edge) => {
	            const [src, dst] = edge;
	            if (src === index) {
	                edges[0].push(edge);
	            }
	            if (dst === index) {
	                edges[1].push(edge);
	            }
	        });
	        return edges;
	    }
	    toEngineJSON() {
	        return {
	            nodes: this.nodes.map((element) => element.type.toEngineJSON()),
	            edges: this.edges.map(([srcIndex, dstIndex, relation]) => [srcIndex, dstIndex, relation.toEngineJSON()]),
	            node_holes: this.node_holes,
	            edge_property: this.edge_property,
	        };
	    }
	}
	class ActiveNode {
	    isNode() { return true; }
	    isConstant() { return false; }
	    toEngineJSON() {
	        return {
	            Node: "ActiveNode",
	        };
	    }
	}
	class AnyNode {
	    isNode() { return true; }
	    isConstant() { return false; }
	    toEngineJSON() {
	        return ({
	            Node: "AnyNode",
	        });
	    }
	}
	class MatchedNode {
	    constructor(matchPath) {
	        this.matchPath = matchPath;
	    }
	    isNode() { return true; }
	    isConstant() { return false; }
	    toEngineJSON() {
	        return ({
	            Node: { MatchedNode: this.matchPath },
	        });
	    }
	}
	class Attribute {
	    isNode() { return false; }
	    isConstant() { return false; }
	    toEngineJSON() {
	        return "Attribute";
	    }
	}
	class Pointer {
	    isNode() { return false; }
	    isConstant() { return false; }
	    toEngineJSON() {
	        return "Pointer";
	    }
	}
	class Constant {
	    constructor(value) {
	        this.value = value;
	    }
	    isConstant() { return true; }
	    isNode() { return false; }
	    toEngineJSON() {
	        return ({
	            Constant: {
	                Primitive: Primitive.from(this.value),
	            },
	        });
	    }
	}
	class NodeConstant {
	    constructor(path) {
	        this.path = path;
	    }
	    isNode() { return true; }
	    isConstant() { return true; }
	    toEngineJSON() {
	        return ({
	            Constant: {
	                Node: this.path,
	            },
	        });
	    }
	}
	class Element {
	    constructor(type, nodePath, originPath) {
	        this.type = type;
	        this.nodePath = nodePath;
	        this.originPath = originPath;
	    }
	}
	var Relation;
	(function (Relation) {
	    class Has {
	        toEngineJSON() {
	            return "Has";
	        }
	    }
	    Relation.Has = Has;
	    class ChildOf {
	        toEngineJSON() {
	            return "ChildOf";
	        }
	    }
	    Relation.ChildOf = ChildOf;
	    class With {
	        constructor(srcProperty, dstProperty) {
	            this.src = srcProperty;
	            this.dst = dstProperty;
	        }
	        toEngineJSON() {
	            return {
	                With: [this.src, this.dst],
	            };
	        }
	    }
	    Relation.With = With;
	})(Relation || (Relation = {}));
	var Property;
	(function (Property) {
	    Property["Name"] = "Name";
	    Property["Value"] = "Value";
	})(Property || (Property = {}));
	var Primitive;
	(function (Primitive) {
	    class String {
	        constructor(String) {
	            this.String = String;
	        }
	    }
	    class Integer {
	        constructor(Integer) {
	            this.Integer = Integer;
	        }
	    }
	    class Boolean {
	        constructor(Boolean) {
	            this.Boolean = Boolean;
	        }
	    }
	    function from(value) {
	        if (typeof value === "boolean") {
	            return new Boolean(value);
	        }
	        else if (typeof value === "number") {
	            return new Integer(value);
	        }
	        else {
	            return new String(value);
	        }
	    }
	    Primitive.from = from;
	})(Primitive || (Primitive = {}));
	/*
	 * A wrapper for element/GME node endpoints
	 */
	class Endpoint {
	    constructor(core, node, element) {
	        this.core = core;
	        this.node = node;
	        this.element = element;
	    }
	    name() {
	        return this.core.getAttribute(this.node, "name");
	    }
	    getProperty() {
	        if (this.name() === "name") {
	            return Property.Name;
	        }
	        else {
	            return Property.Value;
	        }
	    }
	    static async from(core, aNode, path, element) {
	        const rootNode = core.getRoot(aNode);
	        const node = await core.loadByPath(rootNode, path);
	        return new Endpoint(core, node, element);
	    }
	}
	/*
	 * A representation of the GME node required for the rust pattern engine.
	 */
	class GMENode {
	    constructor(path, attributes = {}) {
	        this.id = path;
	        this.attributes = attributes;
	        this.children = [];
	        this.pointers = {}; // TODO
	        this.is_active = false;
	    }
	    setActiveNode(isActive = true) {
	        this.is_active = isActive;
	    }
	    static async fromNode(core, node) {
	        const children = await core.loadChildren(node);
	        const attributes = Object.fromEntries(core.getOwnAttributeNames(node)
	            .map((name) => [name, Primitive.from(core.getAttribute(node, name))]));
	        const gmeNode = new GMENode(core.getPath(node), attributes);
	        gmeNode.children = await Promise.all(children.map((child) => GMENode.fromNode(core, child)));
	        // TODO: Add pointers, etc
	        return gmeNode;
	    }
	}
	function partition(list, fn) {
	    const result = [[], []];
	    list.forEach((item) => {
	        const index = fn(item) ? 0 : 1;
	        result[index].push(item);
	    });
	    return result;
	}
	function assert(cond, error = new Error("Assert failed")) {
	    if (!cond) {
	        throw error;
	    }
	}
	// The following function returns the name and value for the given attribute
	// (or pointer) in the input pattern.
	//
	// For example, suppose an Attribute node, A1, is connected to two other attributes: A2, A3.
	// We might connect the name port of A1 to the value port of A2 and the value port of A1 to
	// the name port of A3. Passing A1 to this function would return:
	//
	//  [A2 (index), Property.Value]  // this one is first since it is connected to "name" of A1
	//  [A3 (index), Property.Name]
	//
	function getNameValueTupleFor(attrIndex, edges) {
	    let name;
	    let value;
	    const withEdges = edges
	        .filter(([, , relation]) => relation instanceof Relation.With);
	    for (const edge of withEdges) {
	        const [srcIndex, dstIndex, relation] = edge;
	        const endpoints = [
	            [srcIndex, relation.src],
	            [dstIndex, relation.dst],
	        ];
	        const [endpoint, otherEndpoint] = endpoints
	            .sort(([index]) => index === attrIndex ? -1 : 1);
	        if (endpoint[1] === Property.Name) {
	            name = otherEndpoint;
	        }
	        else {
	            value = otherEndpoint;
	        }
	        if (name && value) {
	            return [name, value];
	        }
	    }
	    return [name, value];
	}
	function mapKeys(obj, fn) {
	    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [fn(k), v]));
	}
	class MissingRelation extends Error {
	    constructor(nodePath, relation) {
	        super(`Missing relation with ${nodePath}: ${relation.constructor.name}`);
	        this.nodePath = nodePath;
	        this.relation = relation;
	    }
	}
	class NoMatchedNodeError extends Error {
	    constructor(nodePath) {
	        super(`Could not find node created (in previous step) for ${nodePath}`);
	        this.nodePath = nodePath;
	    }
	}
	class UnimplementedError extends Error {
	    constructor(action) {
	        super(`${action} not yet supported.`);
	        this.action = action;
	    }
	}
	// FIXME: we should probably swap to WJI instead...
	class JsonNode {
	    constructor(id) {
	        this.id = id;
	        this.attributes = {};
	        this.pointers = {};
	        this.children = [];
	    }
	}

	class NodeObserver {
	    constructor(client, callback) {
	        this.client = client;
	        this.callback = callback;
	        this.territoryId = dist.None;
	    }
	    observe(nodePath, depth) {
	        // use the client to subscribe to changes in each (territories)
	        this.disconnect();
	        const territoryId = this.client.addUI(this, this.callback);
	        const territory = {};
	        territory[nodePath] = { children: depth };
	        console.log("updateTerritory for", nodePath, ":", territoryId, territory);
	        this.client.updateTerritory(territoryId, territory);
	        this.territoryId = dist.Some(territoryId);
	    }
	    disconnect() {
	        this.territoryId.map((id) => this.client.removeUI(id));
	        this.territoryId = dist.None;
	    }
	}
	class TransformState {
	    constructor() {
	        this.reset();
	    }
	    reset() {
	        this.input = dist.None;
	        this.transformation = dist.None;
	    }
	}
	// FIXME: this tracks two different nodes but the transformation is really derived from
	// the other
	class TransformationObserver {
	    // keep track of the current state (ie, transform and input model)
	    constructor(client, defaultTransformation, callback) {
	        this.callback = callback;
	        this.state = new TransformState();
	        this.modelObserver = new NodeObserver(client, async () => {
	            const input = await this._getNode(client, this.inputPath.unwrap());
	            this.state.input = dist.Some(input);
	            let transformation;
	            if (this.state.transformation.isSome()) {
	                transformation = this.state.transformation.unwrap();
	            }
	            else if (this.transformPath.isNone()) { // use the default if no transformation defined
	                const { core } = await this._getCoreInstance(client);
	                transformation = defaultTransformation(core);
	            }
	            if (transformation) {
	                this._runTransformation(transformation, this.state.input.unwrap());
	            }
	        });
	        this.transformObserver = new NodeObserver(client, async () => {
	            console.log("transform observer callback invoked");
	            if (this.transformPath.isSome()) {
	                const transformPath = this.transformPath.unwrap();
	                const transformation = await this._getTransformation(client, transformPath);
	                this.state.transformation = dist.Some(transformation);
	                if (this.state.input.isSome()) {
	                    this._runTransformation(transformation, this.state.input.unwrap());
	                }
	            }
	        });
	    }
	    observe(inputPath, transformPath) {
	        // use the client to subscribe to changes in each (territories)
	        this.inputPath = dist.Option.from(inputPath);
	        this.transformPath = dist.Option.from(transformPath);
	        console.log(this.inputPath);
	        console.log(this.transformPath);
	        const depth = Number.MAX_SAFE_INTEGER;
	        this.modelObserver.observe(inputPath, depth);
	        if (this.transformPath.isSome()) {
	            this.transformObserver.observe(transformPath, depth);
	        }
	        else {
	            this.transformObserver.disconnect();
	        }
	    }
	    disconnect() {
	        this.modelObserver.disconnect();
	        this.transformObserver.disconnect();
	    }
	    async _getCoreInstance(client) {
	        return new Promise((resolve, reject) => {
	            client.getCoreInstance({}, (err, result) => {
	                if (err)
	                    return reject(err);
	                resolve(result);
	            });
	        });
	    }
	    async _getTransformation(client, nodePath) {
	        const { core, rootNode } = await this._getCoreInstance(client);
	        const transformationNode = await core.loadByPath(rootNode, nodePath);
	        return await Transformation.fromNode(core, transformationNode);
	    }
	    async _getNode(client, nodePath) {
	        const { core, rootNode } = await this._getCoreInstance(client);
	        return await core.loadByPath(rootNode, nodePath);
	    }
	    async _runTransformation(transformation, input) {
	        const output = await transformation.apply(input);
	        this.callback(output);
	    }
	}

	exports.ModelTransformation = Transformation;
	exports.TransformationObserver = TransformationObserver;

}));
