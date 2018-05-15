package wordcloud.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.web.bind.annotation.*;
import wordcloud.service.ElasticsearchGateway;
import wordcloud.service.Js;
import wordcloud.service.Query;

import javax.json.*;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@EnableAutoConfiguration
@RequestMapping(value = "/", produces = "application/json")
public class SearchController {

    @Autowired
    private ElasticsearchGateway esGateway;

    @RequestMapping(value = "/article", method = RequestMethod.POST)
    @ResponseBody
    String save(@RequestBody String article) throws Exception {
        JsonObject incoming = Js.parse(article).readObject();
        JsonString id = (JsonString)incoming.getOrDefault("id", Json.createValue(UUID.nameUUIDFromBytes(article.getBytes()).toString()));

        JsonObject toSave = Js.obj().add("year", incoming.getInt("year"))
                .add("title", incoming.getString("title"))
                .add("summary", incoming.getString("summary"))
                .add("supervisor", incoming.getString("supervisor"))
                .add("link",  incoming.getString("link"))
                .add("author", incoming.getString("author"))
                .add("keywords", incoming.getJsonArray("keywords"))
                .add("id", id)
                .build();

        esGateway.upsert(id.getString(), toSave);
        return Js.obj().add("message", "Success").build().toString();
    }


    @RequestMapping(value = "/article/{articleId}", method = RequestMethod.DELETE)
    @ResponseBody
    String delete(@PathVariable String articleId) throws Exception {
        esGateway.delete(articleId);
        return Js.obj().add("message", "Success").build().toString();
    }

    @RequestMapping("/reindex")
    @ResponseBody
    String reindex() throws Exception {
        JsonArray articles = Js.fileReader("src/main/resources/data.json").readArray();
        esGateway.index(articles);
        return Js.obj().add("message", "Success").build().toString();
    }

    @RequestMapping(value = "/word/search")
    String wordSearch(@RequestParam(value = "q", required = false) String q) {
        JsonObject query = Query.wordCloud(q);

        JsonArray results = esGateway.query(query)
                .getJsonObject("aggregations")
                .getJsonObject("tags")
                .getJsonArray("buckets");

        List<JsonObject> v = results.stream()
                .map((r) -> Js.obj()
                        .add("word", r.asJsonObject().getString("key"))
                        .add("count", r.asJsonObject().getInt("doc_count"))
                        .build())
                .collect(Collectors.toList());

        return Js.toJson(v);
    }

    @RequestMapping("/article/search")
    String articleSearch(@RequestParam(value = "q", required = false) String q) {
        JsonObject query = Query.article(q);

        List<JsonObject> v = esGateway.query(query)
                .getJsonObject("hits")
                .getJsonArray("hits")
                .stream().map((j) -> {
                    JsonNumber score = j.asJsonObject().getJsonNumber("_score");
                    JsonObject source = j.asJsonObject().getJsonObject("_source");
                    return Js.obj(source)
                            .add("score", score)
                            .build();
                })
                .collect(Collectors.toList());

        return Js.toJson(v);
    }
}