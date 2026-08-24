function requireValue(condition: boolean, message: string): void {
  if (!condition) {
    console.log(`regexp-failure:${message}`);
  }
}

export function main(): void {
  const original = /a/g;
  original.lastIndex = 2;
  const called = RegExp(original);
  called.lastIndex = 3;
  requireValue(original.lastIndex === 3, "RegExp call identity");
  const constructed = new RegExp(original);
  constructed.lastIndex = 1;
  requireValue(original.lastIndex === 3 && constructed.lastIndex === 1, "RegExp construction identity");
  requireValue(new RegExp("", "ygimsd").flags === "dgimsy", "canonical flags");

  requireValue(new RegExp("a+?").exec("aaa")?.[0] === "a", "lazy quantifier");
  requireValue(new RegExp("(a)\\1").test("aa"), "backreference");
  requireValue(new RegExp("a(?=b)").test("ab"), "lookahead");
  requireValue(new RegExp("(?<=a)b").test("ab"), "lookbehind");
  requireValue(new RegExp("\\p{Letter}+", "u").test("Ω"), "Unicode property");
  requireValue(new RegExp("[\\p{ASCII}&&\\p{Letter}]+", "v").test("AZ"), "Unicode set intersection");
  requireValue(new RegExp("(?i:a)").test("A"), "inline modifiers");

  const expression = /(?<word>[a-z]+)(\d+)?/dg;
  const executed = expression.exec("ab12");
  requireValue(executed?.[0] === "ab12", "exec whole match");
  requireValue(executed?.groups?.word === "ab", "named group");
  requireValue((executed?.indices?.[0]?.[0] ?? -1) === 0, "match index start");
  requireValue((executed?.indices?.[0]?.[1] ?? -1) === 4, "match index end");
  requireValue(expression.lastIndex === 4, "global lastIndex");
  requireValue(expression.exec("ab12") === null && expression.lastIndex === 0, "failed global reset");

  requireValue(("😀".match(/./g)?.length ?? -1) === 2, "legacy UTF-16 code-unit matching");
  requireValue(("😀".match(/./gu)?.length ?? -1) === 1, "Unicode code-point matching");

  const all: string[] = [];
  for (const item of "a1 b22".matchAll(/(?<letter>[a-z])(\d+)/dg)) {
    all.push((item.groups?.letter ?? "") + (item[2] ?? ""));
  }
  requireValue(all.length === 2 && all[0] === "a1" && all[1] === "b22", "matchAll iteration");

  let callbackArgumentsAreExact = false;
  const callbackReplacement = "a1".replace(
    /([a-z])(\d)/,
    (whole, letter, digit, offset, input) => {
      callbackArgumentsAreExact = whole === "a1" && letter === "a" && digit === "1" &&
        offset === 0 && input === "a1";
      return digit + letter;
    },
  );
  requireValue(callbackArgumentsAreExact && callbackReplacement === "1a", "replacement callback arguments");

  let restArgumentCount = -1;
  const allReplacement = "a1b2".replaceAll(/\d/g, (whole, ...rest) => {
    restArgumentCount = rest.length;
    return `[${whole}]`;
  });
  requireValue(allReplacement === "a[1]b[2]" && restArgumentCount === 2, "replaceAll callback rest arguments");

  const tokenReplacement = "abc".replace(
    /(?<mid>b)/,
    "[$&][$1][$<mid>][$$][$`][$']",
  );
  requireValue(tokenReplacement === "a[b][b][b][$][a][c]c", "replacement tokens");

  const split = "a1b2".split(/(\d)/);
  requireValue(
    split.length === 5 && split[0] === "a" && split[1] === "1" &&
      split[2] === "b" && split[3] === "2" && split[4] === "",
    "split captures",
  );

  const searchExpression = /b/g;
  searchExpression.lastIndex = 2;
  requireValue("abc".search(searchExpression) === 1, "search result");
  requireValue(searchExpression.lastIndex === 2, "search state restoration");
  requireValue(new RegExp(RegExp.escape("a-b")).test("a-b"), "RegExp.escape");

  console.log("regexp-complete");
}

main();
