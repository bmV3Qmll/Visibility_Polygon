#include "../header/2D_template.h"
#include <utility>
#include <list>
#include <iterator>
using namespace std;

#define pii pair<int, int>
#define piib pair<pii, bool>
#define mkp make_pair
#define f first
#define s second

template <class F>
int turn(const Point<F>& a, const Point<F>& b, const Point<F>& c) {
	return sgn(ccw(b, c, a)); // -1: left turn, 0: no turn, 1: right turn
}

bool isSimple(const Polygon<int>& pol) {
	int n = pol.size();

	auto less = [&pol](int lhs, int rhs) -> bool {
		Point<int> l = pol[lhs], r = pol[rhs];
		return mkp(l.x, l.y) < mkp(r.x, r.y);
	};

	vector<piib> events;
	for (int i = 0; i < n; ++i) {
		int j = next(i, n);
		pii edge = (less(j, i)) ? mkp(j, i) : mkp(i, j);
		events.push_back(mkp(edge, 0));
		events.push_back(mkp(edge, 1));
	}

	sort(events.begin(), events.end(), [&](const piib& lhs, const piib& rhs) {
		return less((lhs.s) ? lhs.f.s : lhs.f.f, (rhs.s) ? rhs.f.s : rhs.f.f);
	});

	auto validate = [&](const pii& lhs, const pii& rhs) -> bool {
		if (lhs.f == rhs.f) {
			return turn(pol[lhs.f], pol[lhs.s], pol[rhs.s]);
		}
		if (lhs.s == rhs.s) {
			return turn(pol[lhs.f], pol[rhs.f], pol[rhs.s]);
		}
		if ((lhs.s == rhs.f) || (lhs.f == rhs.s)) {
			return 1;
		}
		Point<double> cut;
		return !intersectLines<1, 1, 1, 1>(makeLine(pol[lhs.f], pol[lhs.s]), makeLine(pol[rhs.f], pol[rhs.s]), cut);
	};

	list<pii> edges;
	for (piib& e : events) {
		auto it = lower_bound(edges.begin(), edges.end(), e.f, [&pol](const pii& edge, const pii& v) {
			return (pol[edge.f] < pol[v.f]) || ((pol[edge.f] == pol[v.f]) && (pol[edge.s] < pol[v.s]));
		});
		if (e.s) {
			if (it != edges.begin() && it != edges.end()) {
				auto nxt = next(it);
				if (nxt != edges.end()) {
					if (!validate(*prev(it), *nxt)) return 0;
				}
			}
			edges.erase(it);
		} else {
			if (it != edges.begin()) {
				if (!validate(*prev(it), e.f)) return 0;
			} 
			if (it != edges.end()) {
				if (!validate(e.f, *it)) return 0;
			}
			edges.insert(it, e.f);
		}
	}
	return 1;
}

int main() {
	int n, x, y;
	cin>>n;
	Polygon<int> pol(n);
	for (int i = 0; i < n; ++i) {
		cin>>x>>y;
		pol[i] = Point<int>(x, y);
	}
	cout<<isSimple(pol);
	return 0;
}