'use strict';

var colors = {

    clickable: 'lightgrey',
    // hover: 'grey',
    clicked: "red",
    clickhover: "darkred"
};

class MapView {
    constructor(divName, visible_countries_geojson) {
        this.map_svg = d3.select("#"+divName);
        this.map_svg.call(responsivefy);

        this.projection = this.calculate_ideal_projection(visible_countries_geojson);

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
                        .attr("class", "tooltip")
                        .style("opacity", 0)
                        .style("transform", "translate(-50%, -100%)") // Center horiziontally
                        .style("pointer-events", "none")        // Ignore mouse events
                        .style("background-color", "white")
                        .style("border", "solid")
                        .style("border-width", "2px")
                        .style("border-radius", "5px")
                        .style("padding", "5px")
                        .style("left", 50 + "px")
                        .style("top", 50 + "px");

        for (const country_data of visible_countries_geojson.features) {
            this.add_country_to_map(country_data);
        }
    }

    add_country_to_map(country_data) {
        console.log("Adding: " + country_data.id);
        // Last country guessed is highlighted - which is also the first country when that's happening.
        var color = country_data.id === GAME_STATE.highlighted_country ? colors.clicked : colors.clickable;

        var tooltip = this.tooltip;
        var svg_map = this.map_svg;

        map_svg.insert("path", ".graticule")
               .datum(country_data)
               .attr("fill", color)
               .attr("stroke", "#222")
               .attr("d", this.path)
               .attr("class", "clickable")
               .attr("data-country-id", country_data.id)
               .on("mouseover", function(event, d) {
                   d3.select(this)
                     .style("stroke", "white")
                     .style("stroke-width", "3px");

                   tooltip.style("opacity", 1);
               })
               .on("mousemove", function(event, d) {
                   // Find event position relative to the svg.
                   var e = d3.pointer(event, svg_map);
                   tooltip
                       .html(d.properties.NAME_EN)
                       .style("left", e[0] + "px")
                       .style("top", e[1] + "px");
               })
               .on("mouseleave", function(event, d) {
                   d3.select(this)
                     .style("stroke", "black")
                     .style("stroke-width", "1px");

                   tooltip.style("opacity", 0);
               });
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
              var data = getVisibleCountriesGeojson();

              // Calculate target projection
              var target_projection = that.calculate_ideal_projection(data);

              var r = d3.interpolate(that.projection.rotate(), target_projection.rotate());
              var s = d3.interpolate(that.projection.scale(), target_projection.scale());
              var o = d3.interpolate(that.projection.translate(), target_projection.translate());
              return function (t) {
                  that.projection.rotate(r(t)).scale(s(t)).translate(o(t));
                  map_svg.selectAll("path").attr("d", that.path);
              }
          });
    }

    remove_country_highlights() {
        // Deselect clicked countries
        d3.selectAll(".clickable")
          .attr("fill", colors.clickable);
    }
}

// Make SVG responsive
function responsivefy(svg) {
    // get container + svg aspect ratio
    var container = d3.select(svg.node().parentNode);
        // width = parseInt(svg.style("width")),
        // height = parseInt(svg.style("height")),
    var aspect = 1.3;

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
