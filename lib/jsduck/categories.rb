require 'jsduck/logger'
require 'jsduck/json_duck'

module JsDuck

  # Reads in categories and outputs them as HTML div
  class Categories
    def initialize(doc_formatter, relations={})
      @doc_formatter = doc_formatter
      @relations = relations
      @categories = []
    end

    # Parses categories in JSON file
    def parse(path)
      @categories = JsonDuck.read(path)["categories"]
    end

    # Prints warnings for missing classes in categories file
    def validate
      listed_classes = {}

      # Check that each class listed in overview file exists
      @categories.each do |cat|
        cat["groups"].each do |group|
          group["classes"].each do |cls_name|
            unless @relations[cls_name]
              Logger.instance.warn("Class '#{cls_name}' in category '#{cat['name']}/#{group['name']}' not found")
            end
            listed_classes[cls_name] = true
          end
        end
      end

      # Check that each existing non-private class is listed in overview file
      @relations.each do |cls|
        unless listed_classes[cls[:name]] || cls[:private]
          Logger.instance.warn("Class '#{cls[:name]}' not found in categories file")
        end
      end
    end

    # Returns HTML listing of classes divided into categories
    def to_html
      return "" if @categories.length == 0

      html = @categories.map do |category|
        [
          "<div class='section classes'>",
          "<h1>#{category['name']}</h1>",
          render_columns(category['groups']),
          "<div style='clear:both'></div>",
          "</div>",
        ]
      end.flatten.join("\n")

      return <<-EOHTML
        <div id='categories-content' style='display:none'>
            #{html}
        </div>
      EOHTML
    end

    def render_columns(groups)
      align = ["lft", "mid", "rgt"]
      i = -1
      return split(groups, 3).map do |col|
        i += 1
        [
          "<div class='#{align[i]}'>",
          render_groups(col),
          "</div>",
        ]
      end
    end

    def render_groups(groups)
      return groups.map do |g|
        [
          "<h3>#{g['name']}</h3>",
          "<div class='links'>",
          g["classes"].map {|cls| @relations[cls] ? @doc_formatter.link(cls, nil, cls) : cls },
          "</div>",
        ]
      end
    end

    # Splits the array of items into n chunks so that the sum of
    # largest chunk is as small as possible.
    #
    # This is a brute-force implementation - we just try all the
    # combinations and choose the best one.
    def split(items, n)
      if n == 1
        [items]
      elsif items.length <= n
        Array.new(n) {|i| items[i] ? [items[i]] : [] }
      else
        min_max = nil
        min_arr = nil
        i = 0
        while i <= items.length-n
          i += 1
          # Try placing 1, 2, 3, ... items to first chunk.
          # Calculate the remaining chunks recursively.
          cols = [items[0,i]] + split(items[i, items.length], n-1)
          max = max_sum(cols)
          # Is this the optimal solution so far? Remember it.
          if !min_max || max < min_max
            min_max = max
            min_arr = cols
          end
        end
        min_arr
      end
    end

    def max_sum(cols)
      cols.map {|col| sum(col) }.max
    end

    # Finds the total size of items in array
    #
    # The size of one item is it's number of classes + the space for header
    def sum(arr)
      header_size = 3
      arr.reduce(0) {|sum, item| sum + item["classes"].length + header_size }
    end

  end

end
