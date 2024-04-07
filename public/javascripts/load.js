const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const nodeAdder = document.getElementById('node');
const lineAdder = document.getElementById('line');
const eraser = document.getElementById('del');
const obs = document.getElementById('obs');
const submit = document.getElementById('submit');
const sidebar = document.querySelector('div.sidebar');
let input = document.getElementById('input');
let output = document.getElementById('output');

let action = 0;
let radius = 10;
let nodes = [];
let edges = [];
let polygon = [];
let observer = undefined;
let visibility = [];

function drawNode(x, y, r, fill, stroke) {
	context.beginPath();
	context.fillStyle = fill;
	context.arc(x, y, r, 0, Math.PI * 2, true);
	context.strokeStyle = stroke;
	context.fill();
	context.stroke();
}

function drawLine(lx, ly, rx, ry, stroke) {
	context.beginPath();
	context.strokeStyle = stroke;
	context.moveTo(lx, ly);
	context.lineTo(rx, ry);
	context.stroke();
}

function draw() {
	context.clearRect(0, 0, window.innerWidth, window.innerHeight);

	if (action == -3 && visibility.length > 0) {
		context.fillStyle = '#ebf0bb';
		context.beginPath();
		context.moveTo(visibility[0].x, visibility[0].y);
		for (let i = 1; i < visibility.length; ++i) {
			context.lineTo(visibility[i].x, visibility[i].y);
		}
		context.closePath();
		context.fill();		
	}

	for (let i = 0; i < edges.length; i++) {
		let fr = edges[i].from;
		let to = edges[i].to;
		drawLine(fr.x, fr.y, to.x, to.y, '#009999');
	}

	for (let i = 0; i < nodes.length; i++) {
		let node = nodes[i];
		drawNode(node.x, node.y, radius, node.selected ? '#88aaaa' : '#22cccc', '#009999');
	}
	if (observer !== undefined) drawNode(observer.x, observer.y, radius, "#f53527", "#91675d");
}

function resize() {
	canvas.width = window.innerWidth - sidebar.clientWidth - 2 * radius;
	canvas.height = window.innerHeight - 2 * radius;
	draw();
}

window.onresize = resize;
resize();

nodeAdder.addEventListener("click", (e) => {
	action = 1;
});

lineAdder.addEventListener("click", (e) => {
	action = 2;
});

eraser.addEventListener("click", (e) => {
	action = -1;
});

obs.addEventListener("click", (e) => {
	action = -2;
});

submit.addEventListener("click", (e) => {
	if (nodes.length != edges.length || undefined === observer) return;
	
	for (let node of nodes) {
		node.neighbor = [];
	}

	for (let edge of edges) {
		edge.from.neighbor.push(edge.to);
		edge.to.neighbor.push(edge.from);
	}

	if (nodes.filter(node => node.neighbor.length != 2).length > 0) return;

	const n = nodes.length;
	let cur = nodes[0];
	let prev = undefined;
	polygon = [];
	for (let i = 0; i < n; ++i) {
		polygon.push(cur);
		let tmp = cur;
		cur = cur.neighbor[0] == prev ? cur.neighbor[1] : cur.neighbor[0];
		prev = tmp;
	}

	for (let node of nodes) {
		node.neighbor = undefined;
	}

	action = -3;

	fetch(window.location.href, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
	    },
	    body: JSON.stringify({
			"n": `${nodes.length}`,
			"nodes": polygon.reduce((acc, cur) => acc.concat(`${cur.x} ${cur.y} `), ''),
			"obs": input.textContent
	    })
	})
		.then(res => res.json())
		.then(data => {
			visibility = data.result.map(pair => {return {x: pair[0], y: pair[1]}});
			draw();
		});
});

let landPoint = undefined;
let selection = undefined;

function getPosRel2Canvas(evt) {
	let rect = canvas.getBoundingClientRect();
	return {
		x: Math.min(Math.max(evt.clientX - rect.left, radius), canvas.width - radius),
		y: Math.min(Math.max(evt.clientY - rect.top, radius), canvas.height - radius)
	};
}

function within(x, y) {
	return nodes.findIndex(n => {
		return x > (n.x - radius) && 
			y > (n.y - radius) &&
			x < (n.x + radius) &&
			y < (n.y + radius);
	});
}

function edgeExists(S, T) {
	for (let i = 0; i < edges.length; ++i) {
		Sprime = JSON.stringify(edges[i].from);
		Tprime = JSON.stringify(edges[i].to);
		if ((S == Sprime && T == Tprime) || (T == Sprime && S == Tprime)) {
			return true;
		}
	}

	return false;
}

function dot(lhs, rhs) {
	return lhs.x * rhs.x + lhs.y * rhs.y;
}

function cross(lhs, rhs) {
	return lhs.x * rhs.y - lhs.y * rhs.x;
}

function dist2Edge(point, edge) {
	let a = {x: point.x - edge.from.x, y: point.y - edge.from.y};
	let b = {x: edge.to.x - edge.from.x, y: edge.to.y - edge.from.y};
	return cross(a, b)**2 / dot(b, b);
}

canvas.onmousedown = (e) => {
	let pos = getPosRel2Canvas(e);
	if (action == -3) return;
	if (undefined === landPoint) {
		landPoint = pos;
		let ind = within(pos.x, pos.y);
		let target = nodes[ind];
		if (target) {
			if (action == -1) {
				let str = JSON.stringify(target);
				edges = edges.filter(e => (JSON.stringify(e.from) != str) && (JSON.stringify(e.to) != str));
				nodes.splice(ind, 1);
			} else if (selection && selection !== target && action == 1) {
				if (!edgeExists(JSON.stringify(selection), JSON.stringify(target))) {
					edges.push({ from: selection, to: target });
				}
			} else {
				selection = target;
				selection.selected = true;
			}
			draw();
		} else if (action == -1) {
			let dist = edges.map(e => dist2Edge(landPoint, e));
			const minDist = Math.min(...dist);
			if (minDist < 25) {
				edges.splice(dist.indexOf(minDist), 1);
			}
		}
	}
}

window.onmouseup = (e) => {
	if (!selection) {
		if (action == 1 && landPoint !== undefined) {
			let node = {
				x: landPoint.x,
				y: landPoint.y,
				selected: false
			};
			nodes.push(node);
		}
		if (action == 2) action = 1;
		if (action == -2 && landPoint !== undefined) {
			observer = landPoint;
			input.textContent = `${observer.x} ${observer.y}`;
		}
	}
	action = Math.max(action - 1, 0);
	if (selection && action == 0) {
		selection.selected = false;
		selection = undefined;
	}
	landPoint = undefined;
	draw();
}

canvas.onmousemove = (e) => {
	if (selection && e.buttons && action == 0) {
		let pos = getPosRel2Canvas(e);
		selection.x = pos.x;
		selection.y = pos.y;
		draw();
	}
}