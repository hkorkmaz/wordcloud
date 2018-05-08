function createGraph(svg, graph) {

    var width = +svg.attr("width"),
        height = +svg.attr("height");

    let parentWidth = d3.select('svg').node().parentNode.clientWidth;
    let parentHeight = d3.select('svg').node().parentNode.clientHeight;

    var svg = d3.select('svg')
    .attr('width', parentWidth)
    .attr('height', parentHeight)

    // remove any previous graphs
    svg.selectAll('.g-main').remove();

    var gMain = svg.append('g')
    .classed('g-main', true);

    var gDraw = gMain.append('g');

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var link = gDraw.append("g")
        .attr("class", "link")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("stroke-width", function(d) { return 1.5; });

    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var drag = d3.drag()
        .on("start", nodeDragStart)
        .on("drag", nodeDragged)
        .on("end", nodeDragEnd)

    var node = gDraw.append("g")
        .attr("class", "node")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("r", function(d){ return 10; })
        .attr("fill", function(d){
            return "title" in d ? "red" : "blue";
        })
        .call(drag)
        .on("click", nodeClick)
        .on("mouseover", nodeMouseOver)
        .on("mouseout", nodeMouseOut)
        .on('dblclick', nodeRelease);

    // add titles for mouseover blurbs
    var forceLink = d3.forceLink()
        .id(function(d) { return d.id; })
        .distance(function(d){  return 40; });

    var simulation = d3.forceSimulation()
        .force("link", forceLink)
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(parentWidth / 2, parentHeight / 2))
        .force("x", d3.forceX(parentWidth/2))
        .force("y", d3.forceY(parentHeight/2));

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    function ticked() {
        // update node and line positions at every step of
        // the force simulation
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    }


    function nodeDragStart(d) {
        if (!d3.event.active) simulation.alphaTarget(0.9).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(this).classed("fixed", d.fixed = true);
    }

    function nodeDragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function nodeDragEnd(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
    }

    function nodeRelease(d) {
        d.fx = null;
        d.fy = null;
        d3.select(this).classed("fixed", d.fixed = false);
    }

    function nodeMouseOver(d) {
        div.transition()
           .duration(200)
           .style("opacity", .9);

        div.html('title' in d ? d.title : d.id)
           .style("left", (d3.event.pageX) + "px")
           .style("top", (d3.event.pageY - 28) + "px");
    }

    function nodeMouseOut(d) {
        div.transition()
           .duration(500)
           .style("opacity", 0);
    }

    function nodeClick(d, i){
        console.log(d);
    }

    return graph;
};
