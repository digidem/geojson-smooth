(function () {
    var margin = {right: 50, left: 50},
        sliderWidth = width - margin.right - margin.left,
        sliderHeight = 50

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", sliderHeight)

    var x = d3.scaleLinear()
        .domain([0, 1])
        .range([0, sliderWidth])
        .clamp(true)

    var slider = svg.append("g")
        .attr("class", "slider")
        .attr("transform", "translate(" + margin.left + "," + sliderHeight / 2 + ")")

    slider.append("line")
        .attr("class", "track")
        .attr("x1", x.range()[0])
        .attr("x2", x.range()[1])
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)) })
        .attr("class", "track-inset")
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)) })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function() { slider.interrupt() })
            .on("start drag", onDrag))

    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + 18 + ")")
      .selectAll("text")
      .data(x.ticks(10))
      .enter().append("text")
        .attr("x", x)
        .attr("text-anchor", "middle")
        .text(function(d) { return d + "" })

    var handle = slider.append("circle", ".track-overlay")
        .attr("class", "handle")
        .call(d3.drag().on("start drag", onDrag))
        .attr("r", 9)
        .attr("cx", x(alpha))

    function onDrag () {
        alpha = x.invert(d3.event.x)
        if (typeof curve.alpha === "function") curve = curve.alpha(alpha)
        if (typeof curve.tension === "function") curve = curve.tension(alpha)
        path.curve(curve)
        handle.attr("cx", x(alpha))
        renderGeoJSON()
        render()
    }
})()
