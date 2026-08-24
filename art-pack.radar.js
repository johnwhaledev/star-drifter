/* art-pack.radar.js — struttura COMPONIBILE di prova (fase B2, 2026-08-06).
   Da caricare DOPO art-pack.js. Merge non distruttivo: aggiunge solo questa voce.
   Invece di una sola immagine ferma, `parts`: ogni pezzo con la sua posizione in celle
   (dx/dy), scala, rotazione fissa (rot) e rotazione continua (spin, gradi al secondo).
   Qui: il pod della stazione sta fermo, l'antenna sopra gira. Si compone nel catalog_editor
   e si piazza nel world editor — questo file è solo la dimostrazione che arriva al gioco. */
window.ART_PACK = window.ART_PACK || {};
window.ART_PACK.structures = Object.assign(window.ART_PACK.structures || {}, {
 "radar_pod": {
  "cellsW": 1,
  "cellsH": 1,
  "src": "componibile: station_pod + kenney_simple-space",
  "parts": [
   {
    "img": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAA0CAYAAACZ8ljPAAAEx0lEQVR4nOWYy08bVxTGvzsesBmDeaYhGFFHikqaZBGpzyxQadgkq6LuuiqVKoUIHFEp+7h/QVAAlUiVSv6Biq6STRukbApVFUVK2lBFiuNiMOVlHraZMZ5bnesHY88DG+xu+kmWB99zv9/cO/fecwaGIzQyMvL2AWODAPoZ0GIVw4E4gDmZ89mpqak3Tn7MDpJhbAj0AQKoTGFwPuPifMYKbgLeuHXrM+qQH43i9eKM349Tp0+jrq7OkpBOp7G2uoqVaBTJROJw1IwN3b937ydb4PDo6B0wFiLjnrNnca63F97GxoqGl9jbw6vFRURevxY3As5D05OT35qAw8HgDwCGCPZxX58Y0Um0trqKX588yUKBmemJia/oQiqMLAfrGxg4MYxEHuSVewxDOQaYWCCSFKY/rl67hpbWVljpn1gMWxsb2N3ZKfq9yedDa3s73urstOwX39rCL48eiWuXrgfkjCSF6I93L12yhS2+eIFIWNyTSVubm6KtJxBA78WLpnbyJO8/nz8HsWhK+6mBFkmlMKMohmKtZPDul/L7zG41lgM7KtZ76B0Qi+a/lJS/yC1fk850d5dtZhdr9C4A8ydEqXovXEBrW9uRMIqhWCsZvWXj8m1saoLL5SoKpn30/pUrYlvQ6UGrshREi8JuW2QyGeFtAuq6jtjyMjq7ukxQEhnamdopk8kIT/I2Tmk4P2xN00SA3fOsROl0WniRp2FKwwSco6vtOKU0iIClSASrKyvHAqfTaWysrwsP8jJ6i5zJgBkODK3FYmjr6IDb7RYtyWQSyUgEiqKg0eeDLMuFtlKlUinsp1KFWTJKVVWQN4lYIlvcCAbvMmCsQVFw7vx5YV4NHRwc4NXLl0glk5Qfx+9PTHxzmJ5GRx+DsX6C0qqjxHsSJRMJsaoJBs7npicnPzUn4FxOpGua3k6/33Ya7aSqKmLRKDbX1/M/FXKhCUi6OTLypS5J4/kS4z01Ct7hR0NXDzKueqiNxYeAe28TroyG1HIEbD2K393+Qokh6frYd1NTD8oroiQpxIHBD6ILAvzOKZ/jyP5ay+bJ3/wfxhkw69L1UFlFVKm+//wjXgnw6x/nHT3lm8HgJzrnYyxbe5oVXUAlGg4GxQ2WinM+KzE2LuucjzPGLqPGYowN6pwH5Dxs4Pr1QmNdfb3Y8Fl9kf16IGogW/Xcvpv9BgoHR9pwCPz88CFBL5sScDHs+FIURXiVSqoFzAkq1wqWF3kmrUboBNvf37dtKydGMXg7ntKUVpbCYexsb0MchA56Oj8PX3MzugMBNLdYvtUJ2VZtf4fD+OPZMwErVxRLfahvxcClN47vlY5acuhbduJ7HLiKakiya1AqfC8st69s1+BraYEkSUjs7tI5WBaIMQZvU5MoSSoGkqgj3a2mqkglElBtlr7b40GD14t6t1vcpJOOfIZk4GloEJ9qSLJroD11XPkc+tqOsL2jQ4yO9paxcnYSxRPM6V3EcUqpIxnQsbUTj9seXx6PRywy+rZ6TbAEUgFbb5FOyMDr9YrPcaUZ8mLhGVL9WFo1V0OapmVr01JgLaBaCcwErCZUs4AVPcPNjY3DX43XVZZUM+f/LVDOvXIHni5UVmEfU2GJcz6e+xdyTUUMYv0LCQAUsaUwdTsAAAAASUVORK5CYII=",
    "cellsW": 1,
    "cellsH": 1,
    "dx": 0,
    "dy": 0,
    "scale": 1,
    "rot": 0,
    "spin": 0
   },
   {
    "img": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAABGdBTUEAALGPC/xhBQAAABtQTFRF////////////////////////AAAAz8/b////cDzRAAAAAAd0Uk5Tb++vP8/fAAnklx4AAAB4SURBVEjHY0gjABhGFQwtBUYdQKCMKg4XAynwAHFaUBXAxUAKOsAAVQFcbFTBEFVg1AEFyjgUeMAUtOBQ0AEHQ1dBeTlCAYxNbwXDIyTT0iJg8q04FDDCFAjgTrTlQIA3VQ9eBRFQvyMDuBhIASPU78gALjY8ahwAd8WM84g68SIAAAAASUVORK5CYII=",
    "cellsW": 1,
    "cellsH": 1,
    "dx": 0,
    "dy": -0.55,
    "scale": 0.9,
    "rot": 0,
    "spin": 45
   }
  ]
 }
});
