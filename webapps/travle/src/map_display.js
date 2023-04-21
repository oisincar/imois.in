'use strict';

var colors = {
    from_country: "var(--country-from)",
    to_country: "var(--country-to)",
    disconnected_country: "var(--country-disconnected)",
    connected_country: "var(--country-connected)",
    country_border: "var(--bs-tertiary-bg)",
    highlighted_border: "var(--country-highlight-border)",
};

// Whether the countries are connected to start/end
var countries_connected_state = {
    disconnected: "disconnected",
    animating: "animating",
    connected: "connected",
};

// var colors = {
//     clickable: 'lightgrey',
//     // hover: 'grey',
//     clicked: "red",
//     clickhover: "darkred"
// };

// Anim to connected
// Refresh

// When a country is added, check if it's touching a visually connected country.
// If so, immediately anim it.

// Post anim, check for any not-visually-connected countries. Anim them.
// (Optional: Make sure not to cancel ongoing animations)

class VisualCountry {
    constructor(id, is_start, is_end) {
        this.id = id;
        this.is_end = is_end;
        this.visually_connected = is_start;

        this.is_hidden = false;
    }
}

class MapView {
    constructor(divName, countries_geojson, countries_connections, game_state)
    {
        this.map_svg = d3.select("#"+divName);
        this.map_svg.call(responsivefy);

        this.countries_geojson = countries_geojson;
        this.countries_connections = countries_connections;

        // Everything's visible from the start, not going to hide things in GAMESTATE.
        this.added_countries = [];
        // this.visible_countries_ids = [start_country_id, end_country_id].concat(guess_ids);

        // Create path and projection based on start/end countries.
        // Then can animate to include any countries users have guessed already.
        this.projection = this.calculate_ideal_projection(
            this.get_countries_geojson([GAME_STATE.start_country, GAME_STATE.target_country]));

        this.path = d3.geoPath()
                      .projection(this.projection);

        var graticule = d3.geoGraticule();

        this.map_svg.attr("class", "map");

        this.map_svg
            .append("defs").append("path")
            .datum({type: "Sphere"})
            .attr("id", "sphere")
            .attr("d", this.path);

        this.map_svg
            .append("use")
            .attr("class", "stroke")
            .attr("xlink:href", "#sphere");

        // Fill in the earth part of the map with opacity...
        // this.map_svg.append("use")
        //     .attr("class", "fill")
        //     .attr("xlink:href", "#sphere");

        this.map_svg.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", this.path);

        // create a tooltip
        this.tooltip = d3.select("#viz")
                        .append("div")
                        .attr("class", "map_tooltip")
                        .style("left", 50 + "px")
                        .style("top", 50 + "px");

        for (const id of GAME_STATE.visible_countries) {
            this.add_country_to_map(id);
        }

        this.recenter_map();
    }

    toggle_visibility(country_id) {
        // TODO: This is pretty dumb. Should be a lookup.
        var country_data;
        for (var i = 0; i < this.added_countries.length; i++) {
            if (this.added_countries[i].id == country_id) {
                country_data = this.added_countries[i];
                this.added_countries[i].is_hidden = !country_data.is_hidden;
                break;
            }
        }

        // Show/ hide in map
        var region_class = "";
        if (country_data.is_hidden) {
            region_class = "country-hidden";
        }
        else if (country_data.visually_connected) {
            // NOTE: If I want to add toggling visibility of start/end country, this could be wrong.
            region_class = "country-connected";
        }
        else {
            region_class = "";
        }

        this.map_svg
            .select("#" + country_id)
            .attr("class", region_class);

        this.recenter_map();

        return country_data.is_hidden;
    }

    touches_connected_country(country_id) {
        var connections = new Set(this.countries_connections[country_id]);
        for (const country of this.added_countries) {
            // Check if it's already a connected country, too... Can touch itself, I guess..!
            if (country.id == country_id && country.visually_connected) {
                return true;
            }
            // Country is touching and connected to start
            if (country.visually_connected && connections.has(country.id)) {
                return true;
            }
        }
        return false;
    }

    get_countries_geojson(country_ids) {
        var data = country_ids.map(country_id => this.countries_geojson[country_id]);
        return {
            type: "FeatureCollection",
            "features": data,
        };
    }

    get_visible_countries_geojson() {
        var data = map.added_countries
                      .filter(c => !c.is_hidden)
                      .map(c => this.countries_geojson[c.id]);
        return {
            type: "FeatureCollection",
            "features": data,
        };
    }

    add_country_to_map(country_id) {

        // Choose color (for now)
        var color;
        var is_start = false;
        var is_end = false;
        if (country_id == GAME_STATE.start_country) {
            is_start = true;
            color = colors.from_country;
        }
        else if (country_id == GAME_STATE.target_country) {
            is_end = true;
            color = colors.to_country;
        }
        else {
            color = colors.disconnected_country;
        }

        this.added_countries.push(new VisualCountry(country_id, is_start, is_end));

        console.log("Adding: " + country_id);
        var country_data = this.countries_geojson[country_id];

        var tooltip = this.tooltip;
        var map_svg = this.map_svg;

        this.map_svg
            .insert("path", ".graticule")
            .datum(country_data)
            .attr("fill", color)
            .attr("stroke", colors.country_border)
            .attr("d", this.path)
            .attr("class", "")
            .attr("id", country_data.id)
            .attr("data-country-id", country_data.id)
            .on("mouseover", function(event, d) {
                d3.select(this)
                  .style("stroke", colors.highlighted_border)
                  .style("stroke-width", "3px");

                tooltip.style("opacity", 1);
            })
            .on("mousemove", function(event, d) {
                // Find event position relative to the svg.
                var e = d3.pointer(event, map_svg);
                tooltip
                    .html(d.properties.NAME_EN)
                    .style("left", e[0] + "px")
                    .style("top", e[1] + "px");
            })
            .on("mouseleave", function(event, d) {
                d3.select(this)
                  .style("stroke", colors.country_border)
                  .style("stroke-width", "1px");

                tooltip.style("opacity", 0);
            });

        // If we're touching a connected country, then we should count as connected too!
        if (!is_start && !is_end && this.touches_connected_country(country_id)) {
            this.anim_to_connected(country_id);
        }
    }

    anim_to_connected(country_id) {
        this.map_svg
            .select("#" + country_id)
            .attr("class", "country-connected");

        // console.log("Anim to connected: " + country_id);


        setTimeout(() => {
            var connections = new Set(this.countries_connections[country_id]);
            for (const country of this.added_countries) {
                // Update our status, as we pass by...
                if (country.id == country_id) {
                    country.visually_connected = true;
                }

                // A country we're touching isn't visually connected... Yet!
                // TODO: This animation could get triggered multiple times.
                if (!country.visually_connected && !country.is_end && connections.has(country.id)) {
                    this.anim_to_connected(country.id);
                }
            }

        }, "500");
    }

    calculate_ideal_projection(geojson) {
        var p = d3.geoCentroid(geojson);

        var m = width * 0.05;

        // Calculate target projection
        var target_projection = d3.geoAzimuthalEquidistant()
                                  .rotate([-p[0],-p[1]])
                                  .fitExtent([[m,m], [width-m, height-m]], geojson);

        return target_projection;
    }

    recenter_map() {
        var that = this;
        d3.transition()
          .duration(1250)
          .tween("rotate", function() {
              var data = that.get_visible_countries_geojson();

              // Calculate target projection
              var target_projection = that.calculate_ideal_projection(data);

              var r = d3.interpolate(that.projection.rotate(), target_projection.rotate());
              var s = d3.interpolate(that.projection.scale(), target_projection.scale());
              var o = d3.interpolate(that.projection.translate(), target_projection.translate());
              return function (t) {
                  that.projection.rotate(r(t)).scale(s(t)).translate(o(t));
                  that.map_svg.selectAll("path").attr("d", that.path);
              }
          });
    }
}

// Make SVG responsive
function responsivefy(svg) {
    // get container + svg aspect ratio
    var container = d3.select(svg.node().parentNode);
        // width = parseInt(svg.style("width")),
        // height = parseInt(svg.style("height")),
    var aspect = 1;

    var targetWidth = parseInt(container.style("width"));

    width = targetWidth;
    height = Math.round(targetWidth / aspect);

    console.log(targetWidth);

    svg.attr("width", width);
    svg.attr("height", height);

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg.attr("viewBox", "0 0 " + width + " " + height)
       .attr("perserveAspectRatio", "xMinYMid")
       .call(resize);

    // to register multiple listeners for same event type,
    // you need to add namespace, i.e., 'click.foo'
    // necessary if you call invoke this function for multiple svgs
    // api docs: https://github.com/mbostock/d3/wiki/Selections#on
    d3.select(window).on("resize." + container.attr("id"), resize);

    // get width of container and resize svg to fit it
    function resize() {
        var targetWidth = parseInt(container.style("width"));
        svg.attr("width", targetWidth);
        svg.attr("height", Math.round(targetWidth / aspect));
    }
    resize();
}
