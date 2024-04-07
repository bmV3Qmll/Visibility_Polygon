const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const node = document.getElementById('node');
const segment = document.getElementById('segment');
const polygon = document.getElementById('polygon');
const eraser = document.getElementById('del');
const start = document.getElementById('start');
const goal = document.getElementById('goal');
const submit = document.getElementById('submit');
const sidebar = document.querySelector('div.sidebar');
let startPos = document.getElementById('startPos');
let goalPos = document.getElementById('goalPos');
let cost = document.getElementById('cost');

let action = 0;
let radius = 10;
let obstacles = [];
let begin = undefined;
let end = undefined;

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

class Polygon {
	vertices;
	isSimple() {
		
	}
	drawInterior() {
		if (nodes.length < 3) return;
		context.fillStyle = '#3673a8';
		context.beginPath();
		context.moveTo(nodes[0].x, nodes[0].y);
		for (let i = 1; i < nodes.length; ++i) {
			context.lineTo(nodes[i].x, nodes[i].y);
		}
		context.closePath();
		context.fill();
	}
	drawEdges() {
		for (let i = 1; i < vertices.length; ++i) {
			let fr = vertices[i - 1];
			let to = vertices[i];
			drawLine(fr.x, fr.y, to.x, to.y, '#224c70');
		}
	}
	drawVertices() {
		for (let vertex of vertices) {
			drawNode(vertex.x, vertex.y, radius, vertex.selected ? '#6a8ca8' : '#438dcc', '#009999');
		}
	}
}

function draw() {
	context.clearRect(0, 0, window.innerWidth, window.innerHeight);
	for (let obstacle of obstacles) {
		obstacle.drawInterior();
		obstacle.drawEdges();
		obstacle.drawVertices();
	}
	if (begin !== undefined) drawNode(begin.x, begin.y, radius, "#f75e5e", "#91675d");
	if (end !== undefined) drawNode(end.x, end.y, radius, "#5ec253", "#91675d");
}

function resize() {
	canvas.width = window.innerWidth - sidebar.clientWidth - 2 * radius;
	canvas.height = window.innerHeight - 2 * radius;
	draw();
}

window.onresize = resize;
resize();

node.addEventListener("click", (e) => {
	action = 1;
});

segmet.addEventListener("click", (e) => {
	action = 2;
});

polygon.addEventListener("click", (e) => {
	action = 3;
});

eraser.addEventListener("click", (e) => {
	action = -1;
});

start.addEventListener("click", (e) => {
	action = -2;
});

start.addEventListener("click", (e) => {
	action = -3;
});

submit.addEventListener("click", (e) => {
	
	/*
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
	*/
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