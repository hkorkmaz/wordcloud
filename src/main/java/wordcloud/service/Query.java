package wordcloud.service;

import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Query {
    private static List<String> FIELDS_TO_SEARCH = Arrays.asList("summary", "title", "keywords", "supervisor", "author");

    public static JsonObject wordCloud(String term) {
        JsonObject query;
        JsonObjectBuilder queryBuilder = Js.obj()
                .add("size", 0)
                .add("aggs", Js.obj()
                        .add("tags", Js.obj()
                                .add("terms", Js.obj()
                                        .add("field", "summary")
                                        .add("size", 160)
                                )));
        if (term != null) {
            query = queryBuilder.add("query", Js.obj()
                    .add("multi_match", Js.obj()
                            .add("query", term)
                            .add("fields", Js.arr(FIELDS_TO_SEARCH))))
                    .build();
        } else {
            query = queryBuilder.add("query", Js.obj()
                    .add("match_all", Js.obj()))
                    .build();
        }

        return query;
    }

    public static JsonObject article(String term) {
        JsonObject sort = Js.obj().add("year", "desc").build();

        JsonObjectBuilder queryBuilder = Js.obj().add("size", 10000)
                .add("track_scores", true)
                .add("sort", Js.arr().add(sort));

        JsonObject query;

        if (term != null) {
            query = queryBuilder.add("query", Js.obj()
                    .add("multi_match", Js.obj()
                            .add("query", term)
                            .add("fields", Js.arr(FIELDS_TO_SEARCH))))
                    .build();
        } else {
            query = queryBuilder.add("query", Js.obj()
                    .add("match_all", Js.obj()))
                    .build();
        }

        return query;
    }
}
