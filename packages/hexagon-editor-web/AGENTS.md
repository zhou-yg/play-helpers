# hexagon-editor

develop by React + Vite + Tailwind

designed for hexagon-grids map editor for game-play

地图数据格式说明：

- indexes : 六边形在网格中的坐标，格式为 [x, y]
- height: 六边形的高度，范围 0-10
- decorations: 六边形的装饰列表，每个装饰有 type 和 position 信息
- type: 装饰类型，如 rock, tree, water 等

示例：

```json
{
	"grid": [
		{
			"indexes": [
				0,
				0
			],
			"height": 2,
      "type": "grass",
			"decorations": [{ "type": "rock" }]
		}
	]
}
```
