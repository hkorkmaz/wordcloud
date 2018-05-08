package wordcloud.service;

import javax.json.*;
import javax.json.bind.JsonbBuilder;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.StringReader;
import java.util.Collection;

public class Js {

    public static JsonObjectBuilder obj() {
        return Json.createObjectBuilder();
    }

    public static JsonArrayBuilder arr() {
        return Json.createArrayBuilder();
    }

    public static JsonArrayBuilder arr(JsonArray arr) {
        return Json.createArrayBuilder(arr);
    }

    public static JsonArrayBuilder arr(Collection arr) {
        return Json.createArrayBuilder(arr);
    }

    public static JsonReader fileReader(String fileName) throws FileNotFoundException {
        return Json.createReader(new FileReader(fileName));
    }

    public static JsonObjectBuilder obj(JsonObject obj) {
        return Json.createObjectBuilder(obj);
    }

    public static String toJson(Object o) {
        return JsonbBuilder.create().toJson(o);
    }

    public static JsonReader parse(String json) {
        return Json.createReader(new StringReader(json));
    }
}
