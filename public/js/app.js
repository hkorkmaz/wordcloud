Array.prototype.inArray = function(comparer) {
    for (var i = 0; i < this.length; i++) {
        if (comparer(this[i])) return true;
    }
    return false;
};

// adds an element to the array if it does not already exist using a comparer
// function
Array.prototype.pushIfNotExist = function(element, comparer) {
    if (!this.inArray(comparer)) {
        this.push(element);
    }
};

var DEBOUNCE_RATE = 300;

Vue.component('modal', {
  template: '#modal-template'
})

Vue.component('confirm', {
  template: '#confirm-template'
})

Vue.component('word-cloud', {
    props: {
        words: {
            type: Array,
            default: []
        }
    },
    data: function() {
        return {
            weight: 2.0
        }
    },
    watch: {
        words: function(newVal, oldVal) {
            this.render()
        },
        weight: _.debounce(function() {
            this.render();
        }, DEBOUNCE_RATE)
    },
    mounted: function() {
        this.render()
    },
    methods: {
        triggerWordClick: function(word) {
            this.$emit('word-click', word)
        },
        triggerWordHover: function(item, dimension, event) {
            console.log(item, dimension, event);
        },
        incWeight: function(){
            if(this.weight < 20)
                this.weight += 0.5
        },
        decWeight: function(){
            if(this.weight > 0.5)
                this.weight -= 0.5
        },
        render: function() {
            var options = {
                list: this.words,
                gridSize: 0,
                weightFactor: this.weight,
                fontFamily: '"Helvetica"',
                color: this.getColor,
                shape: 'triangle-forward',
                click: this.triggerWordClick,
                backgroundColor: '#fff',
                drawOutOfBound: false,
                clearCanvas: false,
                hover: this.triggerWordHover,
                minRotation: 0,
                maxRotation: 0
            }
            WordCloud(this.$el.querySelector(".wc-canvas"), options)
        },
        getColor: function() {
            return "rgb(" + Math.floor(128 * Math.random() + 48).toString(10) + "," + Math.floor(128 * Math.random() + 48).toString(10) + "," + Math.floor(128 * Math.random() + 48).toString(10) + ")"
        }
    },
    template: `<div class="full-screen" id="word-cloud">
	               <div class="wc-canvas"></div>
                   <div class="settings">
                      <button type="button" class="btn btn-secondary btn-sm bg-blue border-0" @click="decWeight">
                        <i class="fa fa-minus"></i>
                      </button>
                      <div class="slider-wrapper">
                        <input type="range" min="0.5" max="20" v-model.number="weight" step="0.5">
                      </div>
                      <button type="button" class="btn btn-secondary btn-sm bg-blue border-0" @click="incWeight">
                        <i class="fa fa-plus"></i>
                      </button>
                      </div>
                   </div>
	           </div>`
})

Vue.component('keyword-relation', {
    props: {
        articles: {
            type: Array
        }
    },
    watch: {
        articles: function(newVal, oldVal) {
            this.render()
        }
    },
    mounted: function() {
        this.render()
    },
    methods: {
        createGraphData: function(data) {
            var nodes = [];
            var max_score = 0, max_year = 0;
            for (i = 0; i < data.length; i++) {
                nodes.push({
                    id: data[i].id,
                    title: data[i].title,
                    data: data[i],
                    score: data[i].score,
                    year: data[i].year
                });

                if(data[i].score > max_score)
                    max_score = data[i].score;

                if(data[i].year > max_year)
                    max_year = data[i].year;

                for (j = 0; j < data[i].keywords.length; j++) {
                    nodes.pushIfNotExist({
                        id: data[i].keywords[j],
                        data: data[i],
                        isKeyword: true
                    }, function(e) {
                        return e.id == data[i].keywords[j];
                    });
                }
            }

            var links = [];
            for (i = 0; i < data.length; i++) {
                for (j = 0; j < data[i].keywords.length; j++) {
                    links.push({
                        "source": data[i].id,
                        "target": data[i].keywords[j]
                    });
                }
            }

            return {
                nodes: nodes,
                links: links,
                max_score: max_score,
                max_year: max_year
            }
        },
        render: function() {
            var graph = this.createGraphData(this.articles);

            var parentWidth = d3.select('.rel-canvas').node().parentNode.clientWidth;
            var parentHeight = d3.select('.rel-canvas').node().parentNode.clientHeight;

            var svg = d3.select('.rel-canvas')
                .attr('width', parentWidth)
                .attr('height', parentHeight - 16)

            svg.selectAll('.g-main').remove();

            var gDraw = svg.append('g')
                .classed('g-main', true);

            var colorScale = d3.schemeSet3;
            var rScale = d3.scaleLinear()
                              .domain([0, graph.max_score])
                              .range([5, 10])

            var yearScale = d3.scaleSequential(d3.interpolateGreys)
                                .domain([2000, graph.max_year]);

            var link = gDraw.append("g")
                .attr("class", "link")
                .selectAll("line")
                .data(graph.links)
                .enter().append("line")
                .attr("stroke-width", function(d) {
                    return 1.5;
                });

            var tooltip = d3.select(this.$el)
                .append("div")
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
                .attr("r", function(d) {
                    if(d.isKeyword)
                        return 5;
                    return d.data.score ? rScale(d.data.score) : 10;
                })
                .attr("fill", function(d) {
                    return d.isKeyword ? "white" : yearScale(d.year);
                })
                .call(drag)
                .on("click", nodeClick)
                .on("mouseover", nodeMouseOver)
                .on("mouseout", nodeMouseOut)
                .on('dblclick', nodeRelease);

            var forceLink = d3.forceLink()
                .id(function(d) {
                    return d.id;
                })
                .distance(20);

            var simulation = d3.forceSimulation()
                .force("link", forceLink)
                .force("collide", d3.forceCollide().radius(function(d) { return d.isKeyword ? 8 : 13; }).iterations(2))
                .force("charge", d3.forceManyBody().strength(-20))
                .force("center", d3.forceCenter(parentWidth / 2, parentHeight / 2))
                .force("x", d3.forceX(parentWidth / 2))
                .force("y", d3.forceY(parentHeight / 2));

            simulation
                .nodes(graph.nodes)
                .on("tick", ticked);

            simulation.force("link")
                .links(graph.links);

/*
            d3.interval(function() {
              var n = graph.nodes.pop(); // Remove c.
              //graph.links.pop(); // Remove c-a.
              //graph.links.pop(); // Remove b-c.
              if(n){
                  var newLinks = graph.links.filter(function(l){
                    return l.source.id !== n.id && l.target.id !== n.id
                  })

                  graph.links = newLinks;
                  console.log("XXXXX" , newLinks.length, graph.links.length);
                  restart(graph.nodes, newLinks);
              }
            }, 2000, d3.now());
*/
            function restart(newNodes, newLinks) {
                // Apply the general update pattern to the nodes.
                node = node.data(newNodes, function(d) { return d.id;});

                node.exit().transition()
                    .attr("r", 0)
                    .remove();

                node = node.enter().append("circle")
                    .call(function(node) { node.transition().attr("r", 8); })
                    .merge(node);

                // Apply the general update pattern to the links.
                link = link.data(newLinks, function(d) { return d.source.id + "-" + d.target.id; });

                // Keep the exiting links connected to the moving remaining nodes.
                link.exit().transition()
                    .attr("stroke-opacity", 0)
                    .attrTween("x1", function(d) { return function() { return d.source.x; }; })
                    .attrTween("x2", function(d) { return function() { return d.target.x; }; })
                    .attrTween("y1", function(d) { return function() { return d.source.y; }; })
                    .attrTween("y2", function(d) { return function() { return d.target.y; }; })
                    .remove();

                link = link.enter().append("line")
                    .call(function(link) { link.transition().attr("stroke-opacity", 1); })
                  .merge(link);

                // Update and restart the simulation.
                simulation.nodes(newNodes);
                simulation.force("link").links(newLinks);
                simulation.alpha(1).restart();
            }

            function ticked() {
                // update node and line positions at every step of
                // the force simulation
                link.attr("x1", function(d) {
                        return d.source.x;
                    })
                    .attr("y1", function(d) {
                        return d.source.y;
                    })
                    .attr("x2", function(d) {
                        return d.target.x;
                    })
                    .attr("y2", function(d) {
                        return d.target.y;
                    });

                node.attr("cx", function(d) {
                        return d.x;
                    })
                    .attr("cy", function(d) {
                        return d.y;
                    });
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
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                tooltip.html(getTooltipHtml(d))
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            }

            function nodeMouseOut(d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            }

            function nodeClick(d, i) {
                console.log(d);
            }

            function getTooltipHtml(d) {
                if (d.isKeyword)
                    return d.id;
                else {
                    var compiled = _.template('Title: <%= data.title %> <br/>' +
                        'Author:  <%= data.author %> <br/>' +
                        'Supervisor:  <%= data.supervisor %> <br/>' +
                        'Year:  <%= data.year %>'
                    );
                    return compiled(d);
                }

            }
        }
    },
    template: `<div class="full-screen">
	              <svg class="rel-canvas"></svg>
	              <div class="tooltip" style="display:none"></div>
	           </div>
	            `
})


const Home = {
    props: ['query'],
    data: function() {
        return {
            words: [],
            showModal: false,
            selectedWord: []
        }
    },
    watch: {
        query: function(newVal, oldVal) {
            this.getWords()
        }
    },
    methods: {
        wordClicked: function(word) {
            this.showModal = true;
            this.selectedWord = word;
        },
        getWords: _.debounce(function() {
            var self = this;
            var params = this.getParams();
            self.words = [];
            this.$http.get('/word/search', {
                params: params
            }).then(function(response) {
                response.data.map(function(i) {
                    self.words.push([i.word, i.count])
                })
            });
        }, DEBOUNCE_RATE),
        getParams: function() {
            return this.query ? { 'q': this.query } : {};
        }
    },
    mounted: function() {
        this.getWords()
    },
    template: `
  		<div>
  			<word-cloud :words="words" @word-click="wordClicked"></word-cloud>
            <modal v-if="showModal" @close="showModal = false">
                <h6 slot="header">
                    Message
                </h6>

                <span slot="body">
                    <i>{{selectedWord[0]}}</i> is found in
                    {{selectedWord[1]}} theses
                </span>
            </modal>
		</div>
  		`
}

const Relation = {
    props: ['query'],
    data: function() {
        return {
            articles: []
        }
    },
    watch: {
        query: function(newVal, oldVal) {
            this.getArticles()
        }
    },
    methods: {
        getArticles: _.debounce(function() {
            var self = this;
            var params = this.getParams();
            self.articles = [];
            this.$http.get('/article/search', {
                params: params
            }).then(function(response) {
                response.data.map(function(i) {
                    self.articles.push(i)
                })
            });
        }, DEBOUNCE_RATE),
        getParams: function() {
            return this.query ? {
                'q': this.query
            } : {};
        }
    },
    mounted: function() {
        this.getArticles()
    },
    template: `
  		<div>
  			<keyword-relation :articles="articles"></keyword-relation>
		</div>`
}

const Admin = {
    props: ['query'],
    data: function() {
        return {
            articles: [],
            article: null,
            showConfirm: false,
            showModal: false,
            modalMessage: 'Thesis updated successfully'
        }
    },
    watch: {
        query: _.debounce(function(newVal, oldVal) {
            this.getArticles()
        }, DEBOUNCE_RATE)
    },
    methods: {
        getArticles: function() {
            var params = this.query ? { 'q': this.query } : {};
            this.articles = [];
            this.$http.get('/article/search', { params: params }).then(function(response) {
                this.articles = response.data.map(function(i) {
                    return i;
                })
            });
        },
        setArticle: function(article){
            this.article = article;
        },
        activeArticle: function (id) {
            return {
                active: this.article && this.article.id == id
            }
        },
        clearArticle: function(){
            this.article = null;
        },
        newArticle: function(){
            this.article = {};
        },
        saveArticle: function(){
            this.$http.post('/article', this.article).then(function(response) {
                this.showModal = true;
            });
        },
        deleteArticle: function(){
            this.$http.delete('/article/' + this.article.id).then(function(response) {
                this.article = {};
                this.getArticles();
                this.showConfirm = false;
            });
        }
    },
    computed: {
      keywordList: {
        get: function () {
          return this.article.keywords;
        },
        set: function (newValue) {
          this.article.keywords = newValue.split(',')
        }
      }
    },
    mounted: function() {
        this.getArticles()
    },
    template: `
  		<div class="w-100" id="articles-container">
  		    <div class="new-article">
  		        <button class="btn btn-circle bg-blue btn-secondary" @click="newArticle"><i class="fa fa-plus"></i></button>
  		    </div>

            <confirm v-if="showConfirm" @yes="deleteArticle" @no="showConfirm = false">
                <span slot="body">
                    Are you sure?
                </span>
            </confirm>

            <modal v-if="showModal" @close="showModal = false">
                <span slot="body">
                    {{modalMessage}}
                </span>
            </modal>

          	<div class="w-80">
                <table class="w-100" id="article-list">
                    <tr class="row list-header">
                        <td class="col-lg-5">Title</td>
                        <td class="col-lg-3">Supervisor</td>
                        <td class="col-lg-2">Author</td>
                        <td class="col-lg-1">Year</td>
                        <td class="col-lg-1"></td>
                    </tr>
                    <tr v-for="art of articles" class="row list-row" v-bind:class="activeArticle(art.id)" @click="setArticle(art)" :key="art.id">
                        <td class="col-lg-5 text-truncate">{{art.title}}</td>
                        <td class="col-lg-3">{{art.supervisor}}</td>
                        <td class="col-lg-2">{{art.author}}</td>
                        <td class="col-lg-1">{{art.year}}</td>
                        <td class="col-lg-1">
                            <a :href="art.link" target="_blank" v-if="art.link" class="external-link">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        </td>
                    </tr>
                    <tr class="row list-footer">
                        <td class="col-lg-7">Total : {{articles.length}}</td>
                    </tr>
                </table>
            </div>
            <transition name="slide-sidebar">
                <div class="sidebar" v-if="article">
                    <form class="container">

                      <div class="sidebar-title">
                        Details
                        <button type="button" class="close" @click="clearArticle">
                          <span>&times;</span>
                        </button>
                      </div>

                      <div class="form-group">
                        <label>Title</label>
                        <textarea class="form-control"rows="2" v-model="article.title"></textarea>
                      </div>

                      <div class="form-group">
                        <label>Author</label>
                        <input type="text" class="form-control" v-model="article.author">
                      </div>
                      <div class="form-group">
                        <label>Supervisor</label>
                        <input type="text" class="form-control" v-model="article.supervisor">
                      </div>
                      <div class="form-group">
                        <label>Keywords</label>
                        <textarea class="form-control" rows="3" v-model="keywordList"></textarea>
                      </div>
                      <div class="form-group">
                        <label>Year</label>
                        <input type="text" class="form-control" v-model.number="article.year">
                      </div>
                      <div class="form-group">
                        <label>Link</label>
                        <input type="text" class="form-control" v-model.number="article.link">
                      </div>
                      <div class="form-group">
                        <label>Abstract</label>
                        <textarea class="form-control" rows="10" v-model="article.summary"></textarea>
                      </div>

                      <input type="hidden" class="form-control" v-model="article.id" />
                      <div class="form-group" style="text-align:center">
                        <button type="submit" class="btn btn-secondary w-25" @click="showConfirm = true">Delete</button>
                        <button type="submit" class="btn btn-secondary w-25" @click="saveArticle">Save</button>
                      </div>
                    </form>
                </div>
            </transition>
		</div>`
}

const router = new VueRouter({
    routes: [
        { name: 'home', path: '/', component: Home, props: true },
        { name: 'rels', path: '/relation', component: Relation, props: true },
        { name: 'admin', path: '/thesis', component: Admin, props: true }
    ]
})

const app = new Vue({
        router: router,
        data: function() {
            return {
                query: ""
            }
        }
    })
    .$mount('#app')