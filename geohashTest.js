var geohash = function() {
	/**
	 * [10000,01000,00100,00010,00001]
	 * @type {Array}
	 */
	var _Bits = [16, 8, 4, 2, 1];
	/**
	 * 字符数组
	 * @type {Array}
	 */
	var _Base32 = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "b", "c", "d", "e", "f", "g", "h", "j", "k", "m", "n", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];

	/**
	 * 对经纬度进行geohash编码
	 * @param  {number} latitude    纬度
	 * @param  {number} longitude   经度
	 * @param  {number} length      所得的geohash字符串长度
	 * @return {string} geohash     字符串
	 */
	var encode = function(latitude, longitude, length) {
		if (!latitude || typeof(latitude) !== 'number' || latitude > 90.0 || latitude < -90.0) {
			throw new Error('invalid parameter: latitude');
		}
		if (!longitude || typeof(longitude) !== 'number' || longitude > 180.0 || longitude < -180.0) {
			throw new Error('invalid parameter: longitude');
		}
		var even = true;
		var bit = 0;
		var ch = 0;
		var geohashString = "";

		var _lat = [-90.0, 90.0];
		var _lon = [-180.0, 180.0];

		if (!length || length < 1 || length > 20) {
			length = 12;
		}

		while (geohashString.length < length) {
			var mid;

			if (even) {
				mid = (_lon[0] + _lon[1]) / 2;
				if (longitude > mid) {
					ch = ch | _Bits[bit];//或运算，当在右侧区间时，经度位为1
					_lon[0] = mid;
				} else
					_lon[1] = mid;
			} else {
				mid = (_lat[0] + _lat[1]) / 2;
				if (latitude > mid) {
					ch = ch | _Bits[bit];//或运算，当在上方区间时，纬度位为1
					_lat[0] = mid;
				} else
					_lat[1] = mid;
			}

			even = !even;
			if (bit < 4)
				bit++;
			else {
				geohashString += _Base32[ch];
				bit = 0;
				ch = 0;
			}
		}		
		return geohashString;
	};

	/**
	 * 对geohash字符串解码
	 * @param  {string} geohashString geohash字符串
	 * @return {object} {lat:纬度 ,lon:经度,latInterval:纬度区间,lonInterval:经度区间;} note:经纬度区间即为其区块大小
	 */
	var decode = function(geohashString) {
		if (!geohashString) {
			throw new Error("invalid parameter: geohashString");
		}
		var even = true;
		var _lat = [-90.0, 90.0];
		var _lon = [-180.0, 180.0];
		var hashLength = geohashString.length;
		for (var i = 0; i < hashLength; i++) {
			var ch = _Base32.indexOf(geohashString.charAt(i));
			if (ch<0) {
				throw new Error("invalid parameter: geohashString include invalid letter;");
			}
			for (var j = 0; j < 5; j++) {
				var mask = _Bits[j];
				if (even) {//五位二进制 第一位为经度,第二个为纬度，依此类推下去
					_lon = refineInterval(_lon, ch, mask);
				} else {
					_lat = refineInterval(_lat, ch, mask);
				}
				even = !even;
			}
		}

		return {
			lat: (_lat[0] + _lat[1]) / 2,//默认取区块中心纬度,有误差 
			lon: (_lon[0] + _lon[1]) / 2,//默认取区块中心经度,有误差
			latInterval: _lat,
			lonInterval: _lon
		};
	};

	/**
	 * 求取经纬度区间
	 * @param  {array} interval 区间数组
	 * @param  {number} ch      字母所对应的值 (如 w--> 28 即 11100)
	 * @param  {number} mask    _Bits[i] ([16, 8, 4, 2, 1] 即[10000,01000,00100,00010,00001])
	 * @return {array}          区间数组
	 */
	var refineInterval = function(interval, ch, mask) {
		if ((ch & mask) !== 0) {
			interval[0] = (interval[0] + interval[1]) / 2;
		} else {
			interval[1] = (interval[0] + interval[1]) / 2;
		}
		return interval;
	};

	/**
	 * 获取某个geohash周边的八个相邻区块的geohash
	 * @param  {string} geohashString geohash字符串
	 * @return {object} {
	 *						"topRight":右上 ,
	 *						"top":上方 ,
	 *						"topLeft":左上 ,
	 *						"left":左 ,
	 *						"bottomLeft":左下 ,
	 *						"bottom":下方 ,
	 *						"bottomRight":右下 ,
	 *						"right":右
	 *					}
	 *
	 *    [1,-1]topLeft       [1,0]top        [1,1]topRight
	 *    
	 *    [0,-1]left          [0,0]   		  [0,1]right
	 *    
	 *    [-1,-1]bottomLeft   [-1,0]bottom    [-1,1]bottomRight
	 */

	var expand = function(geohashString) {
		if (!geohashString || typeof(geohashString) !== 'string') {
			throw new Error("invalid parameter: geohashString");
		}
		var neighbors = {};
		var neighborDirection = {
			"topRight": [1, 1],
			"top": [1, 0],
			"topLeft": [1, -1],
			"left": [0, -1],
			"bottomLeft": [-1, -1],
			"bottom": [-1, 0],
			"bottomRight": [-1, 1],
			"right": [0, 1]
		};
		for (var p in neighborDirection) {
			neighbors[p] = getNeighbor(geohashString, neighborDirection[p]);
		}
		return neighbors;
	};
	/**
	 * 获取某个方位的geohash字符串
	 * @param  {string} geohashString    geohash字符串
	 * @param  {array}  direction        方向数组:direction[0]为1表示在其上方,direction[0]为-1表示在其下方;
	 *                               		       direction[1]为1表示在其右侧,direction[1]为-1表示在其左侧
	 * @return {string} geohashString
	 */
	var getNeighbor = function(geohashString, direction) {
		var point = decode(geohashString);
		//latInterval[1]-latInterval[0] 为区块的长或宽
		var neighborLat = point.lat + direction[0] * (point.latInterval[1] - point.latInterval[0]);
		var neighborLon = point.lon + direction[1] * (point.lonInterval[1] - point.lonInterval[0]);
		return encode(neighborLat, neighborLon, geohashString.length);
	};

	return {
		encode: encode,
		decode: decode,
		expand: expand,
		neighbor: getNeighbor
	};
}();