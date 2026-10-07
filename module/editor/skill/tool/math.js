export function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min) + min)
};
export function isEven(number) {
	return !(number & 1);
}
export function isOdd(number) {
	return !(!(number & 1));
}
export function getSymbol(str) {
	let symbol;
	// 根据输入字符串的内容，确定并设置符号变量
	if (['减', '-', '减少'].includes(str)) symbol = '-';
	else if (['加', '+', '增加'].includes(str)) symbol = '+';
	else if (['乘', '*', '乘以'].includes(str)) symbol = '*';
	else if (['取模', '%', '模'].includes(str)) symbol = '%';
	return symbol;
}
export function apSum(first, endIndex, difference) {
	const last = first + (endIndex - 1) * difference
	return (first + last) * endIndex / 2
}
export function chineseToArabic(chinese) {
	if (!/[零一二两三四五六七八九十百千万]/.test(chinese)) return chinese;
	const chineseNumbers = {
		'零': 0,
		'一': 1,
		'二': 2,
		'两': 2,
		'三': 3,
		'四': 4,
		'五': 5,
		'六': 6,
		'七': 7,
		'八': 8,
		'九': 9
	};
	const chineseUnits = {
		'十': 10,
		'百': 100,
		'千': 1000,
		'万': 10000
	};
	let result = 0;
	let temp = 0;
	let unit = 1;
	for (let i = chinese.length - 1; i >= 0; i--) {
		const char = chinese[i];
		if (chineseUnits[char]) {
			if (chineseUnits[char] >= 10000) {
				unit = chineseUnits[char];
				result += temp * unit;
				temp = 0;
			} else {
				unit = chineseUnits[char];
			}
		} else if (chineseNumbers[char] !== undefined) {
			temp += chineseNumbers[char] * unit;
		}
	}
	return result + temp;
}
export class x19D6_Math {
	static "Math_!"(x) {
		if (x < 0) return
		else if (x == 0) return 1
		return x * x19D6_Math["Math_!"](x - 1)
	};
	static "Math_f"(n) {
		if (n < 1) return
		else if (n <= 2) return 1
		else {
			var x = 1, y = 1, z
			for (var i = 2; i < n; i++) {
				z = x + y
				y = x
				x = z
			}
			return x
		}
	};
	//算π
	static "Math_doPI"(n) {
		var π = Math.PI, cos = Math.cos
		if (n >= 6111123) return π.toFixed(10)
		return (cos((π / 2) - (π / n)) * n).toFixed(10)
	};
	//算e
	static "Math_doe"(y) {
		var x = 1 + (1 / y)
		if (y > 60028450) return Math.E.toFixed(10)
		/*x^(1+1/x)*/
		return (Math.pow(x, y)).toFixed(10)
	};
	//算Φ
	static "Math_doΦ"(n) {
		/*斐波拉契数列前后两项之比随项数增大，越来越趋近黄金分割*/
		var a = x19D6_Math["Math_f"](n)
		var b = x19D6_Math["Math_f"](n + 1)
		if (n > 25) return 0.6180339887.toFixed(10)
		return (a / b).toFixed(10)
	};
	static 'randomInt'(min, max) {
		return Math.floor(Math.random() * (max - min) + min)
	}
	static 'ND'(mu, sigma) {
		const pi = Math.PI, sqrt = Math.sqrt, e = Math.E;
		const coefficient = 1 / (sqrt(2 * pi) * sigma);
		return (x) => {
			const exponent = -((x - mu) ** 2 / (2 * sigma ** 2));
			return coefficient * e ** exponent;
		}
	}
	static "NDRandom"(mu = 0, sigma = 1) {
		let u1 = 0, u2 = 0;
		while (u1 === 0) u1 = Math.random();
		u2 = Math.random();
		const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
		return z0 * sigma + mu;
	}
}
