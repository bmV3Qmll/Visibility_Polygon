#include <iostream>
#include <iomanip>
#include "./2D_template.h"

template <class F1, class F2>
int preProcessing(const Point<F1>& point, Polygon<F2> & poly) {
	int n = static_cast<int>(poly.size()), windingNumber = 0;
	Point<F2> v0 = poly[0];
	int i, v1;
	for (i = 0; i < n; ++i) {
		if (point == poly[i]) {
			--i;
			break;
		}
		int j = next(i, n);
		if (poly[i].y == point.y && poly[j].y == point.y) {
			if (min(poly[i].x, poly[j].x) <= point.x &&
				point.x <= max(poly[i].x, poly[j].x)) break;
		} else {
			bool below = poly[i].y < point.y;
			if (below != (poly[j].y < point.y)) {
				auto orientation = ccw(point, poly[j], poly[i]);
				if (orientation == 0) break;
				if (below == (orientation > 0)) windingNumber += below ? 1 : -1;
			}
		}
		Point<F2> c;
		Line<F2> ln = makeLine(poly[i], poly[j]);
		closest(point, ln, c);
		if (dist2(point, c) < dist2(point, v0)) {
			v0 = c;
			v1 = j;
		}
	}
	if (i < n) { // boundary
		int j = next(i, n);
		rotate(begin(poly), begin(poly) + j, end(poly));
		return 0;
	} else if (windingNumber) { // interior
		if (v0 == poly[0]) return -1;
		if (v0 == poly[v1]) {
			rotate(begin(poly), begin(poly) + v1, end(poly));
		} else {
			rotate(begin(poly), begin(poly) + v1, end(poly));
			poly.push_back(v0);
			rotate(rbegin(poly), rbegin(poly) + 1, rend(poly));
		}
		return -1;
	} // exterior
	return 1;
}

template <class F1, class F2>
void trans2Polar(const Point<F1>& center, Polygon<F2> & poly) {
	for (auto & vertex : poly) {
		vertex -= center;
		vertex = makePoint(norm(vertex), angle(vertex));
		vertex.y = ((vertex.y < 0) ? vertex.y + 2 * M_PI : vertex.y);
	}
}

template <class F>
int turn(const Point<F>& a, const Point<F>& b, const Point<F>& c) {
	return sgn(ccw(b, c, a)); // -1: left turn, 0: no turn, 1: right turn
}

template <class F>
void advance(const Point<F>& z, const Polygon<float>& P, int n, const vector<float>& ang,
	int & v, Polygon<float>& s, int & t, vector<float>& alpha, 
	int & action, bool & counter, Point<float>& w, bool & ray) {
	while (action == 1) {
		// ALERT: v + 1 == n ? append to ang
		if (ang[v + 1] <= 2 * M_PI) {
			v += 1; t += 1; s.push_back(P[v]); alpha.push_back(ang[v]);
			if (v + 1 == n) {
				action = 2; break;
			}
			if (ang[v + 1] < ang[v]) {
				int trn = turn(P[v - 1], P[v], P[v + 1]);
				if (trn == 1) {
					action = 0; counter = 1; ray = 1;
				} else if (trn == -1) {
					action = -1;
				}
			}
		} else {
			if (ang[v] < 2 * M_PI) {
				t += 1; s.push_back(Point<float>()); alpha.push_back(2 * M_PI);
				intersectLines<2, 0, 2, 2>(makeLine(Point<float>(z), P[0]), makeLine(P[v], P[v + 1]), s[t]);
			}
			action = 0; counter = 0; w = P[0]; ray = 0;
		}
	}
}

template <class F>
void retard(const Point<F>& z, const Polygon<float>& P, int n, const vector<float>& ang,
	int & v, Polygon<float>& s, int & t, vector<float>& alpha, 
	int & action, bool & counter, Point<float>& w, bool & ray) {
	while (action == -1) {
		int j = t - 1; // preserves this relationship in for loop
		for (; j >= 0; --j, --t) {
			if (alpha[j] < ang[v + 1]) {
				v += 1; alpha[t] = ang[v];
				intersectLines<2, 0, 1, 1>(makeLine(Point<float>(z), P[v]), makeLine(s[j], s[t]), s[t]);

				if (v == n - 1) action = 2;
				else {
					int trn = turn(P[v - 1], P[v], P[v + 1]);
					if ((ang[v + 1] >= ang[v]) && (trn == 1)) action = 1;
					else if ((ang[v + 1] > ang[v]) && (trn == -1)) {
						action = 0; counter = 0;  w = P[v]; ray = 0;
					}
				}
				if (action > 0) {
					t += 1; s.push_back(P[v]); alpha.push_back(ang[v]);
				}
				break;
			} 
			if (alpha[j] == alpha[t]) {
				if (intersectLines<2, 1, 2, 2>(makeLine(P[v], P[v + 1]), makeLine(s[j], s[t]), w)) {
					if ((ang[v + 1] == alpha[j]) && (ang[v + 2] > ang[v + 1]) && (turn(P[v], P[v + 1], P[v + 2]) == 1)) {
						action = 1; v += 1; s[t] = P[v]; 
					} else {
						action = 0; counter = 1; t -= 1; s.pop_back(); alpha.pop_back(); ray = 0;
					}
					break;
				}
			}
			s.pop_back(); alpha.pop_back();
		}
	}
}

template <class F>
void scan(const Point<F>& z, const Polygon<float>& P, int n, const vector<float>& ang,
	int & v, Polygon<float>& s, int & t, vector<float>& alpha, 
	int & action, bool & counter, Point<float>& w, bool & ray) {
	while (!action) {
		v += 1;
		bool intersect;
		if (counter && (ang[v + 1] > alpha[t]) && (alpha[t] >= ang[v])) {
			if (ray) intersect = intersectLines<2, 0, 1, 1>(makeLine(Point<float>(z), s[t] - z, false),
				makeLine(P[v], P[v + 1]), w);
			else intersect = intersectLines<2, 2, 1, 1>(makeLine(s[t], w), makeLine(P[v], P[v + 1]), w);
			if (intersect) {
				action = 1; t += 1; s.push_back(w); alpha.push_back(alpha.back());
			}
		} else if (!counter && (ang[v + 1] <= alpha[t]) && (alpha[t] < ang[v])) {
			if (ray) intersect = intersectLines<2, 0, 1, 1>(makeLine(Point<float>(z), s[t] - z, false),
				makeLine(P[v], P[v + 1]), w);
			else intersect = intersectLines<2, 2, 1, 1>(makeLine(s[t], w), makeLine(P[v], P[v + 1]), w);
			if (intersect) {
				action = -1;
			}
		}
	}
}

template <class F1, class F2>
Polygon<float> visPol(const Point<F1>& z, const Polygon<F2> & poly) {
	int n = static_cast<int>(poly.size());
	Polygon<float> P(n);
	for (int i = 0; i < n; ++i) {
		P[i] = poly[i];
	}

	int zVsP = preProcessing(z, P);
	n = static_cast<int>(P.size());
	// If obs is outside, return empty polygon.
	if (zVsP == 1) return Polygon<float>();

	vector<float> ang(n);
	ang[0] = 0;
	for (int i = 1; i < n; ++i) {
		ang[i] = ang[i - 1] + angle(P[i - 1], P[i], z);
	}
	/*
	for (int i = 0; i < n; ++i) {
		cout<<P[i]<<" -> "<<ang[i]<<'\t';
	} cout<<'\n';
	*/
	int v = 0, t = 0; // index of current vertex of polygon / stack
	int action; // 1: ADVANCE, 0: SCAN, -1: RETARD, 2: FINISH
	bool counter; // 1: counter-clockwise, 0: clockwise
	Point<float> w; // s_0 w
	bool ray; // if w is infinite
	Polygon<float> s;
	vector<float> alpha;
	s.push_back(P[0]); alpha.push_back(0);
	if (ang[1] >= ang[0]) action = 1;
	else {
		action = 0; counter = 1; ray = 1;
	}
	while (action != 2) {
		switch (action) {
		case 1:
			advance(z, P, n, ang, v, s, t, alpha, action, counter, w, ray);
			break;
		case 0:
			scan(z, P, n, ang, v, s, t, alpha, action, counter, w, ray);
			break;
		default:
			retard(z, P, n, ang, v, s, t, alpha, action, counter, w, ray);
		}
	}
	return s;
}

int main() {
	int n;
	cin>>n;
	Polygon<int> poly(n);
	for (int i = 0; i < n; ++i) {
		cin>>poly[i];
	}
	if (!orientation(poly)) reverse(begin(poly), end(poly));
	Point<int> obs;
	cin>>obs;
	Polygon<float> chain = visPol(obs, poly);
	for (auto & vertex : chain) cout<<Point<int>(vertex)<<'\n';
	return 0;
}