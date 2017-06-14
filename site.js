/* global $, React*/

var d = React.DOM;

var timeSort = function (l, r) {
    return r.created_at.localeCompare(l.created_at);
};

var repoDefaults = [
    { repo: "servo", language: "A-infrastructure" },
    { repo: "saltfs", language: "S-needs-deploy" },
];

var langLabels = [{
        name: "A-Infrastructure",
        color: "bfd4f2",
        url:  "https://api.github.com/servo/servo/labels/A-Infrastructure",
        selected: true
    },
    {
        name: "S-needs-deploy",
        color: "bfd4f2",
        url:  "https://api.github.com/servo/saltfs/labels/S-needs-deploy",
        selected: true
    },
];

var getIssueLanguageLabel = function (issue) {
    for (var i = 0; i < issue.labels.length; i++) {
        var label = issue.labels[i];
        if (/^L-(.*)/.test(label.name)) {
            return label;
        }
    }
    return null;
};

var addDefaultLanguageLabel = function (issue) {
    if (getIssueLanguageLabel(issue) !== null) {
        return issue;
    }

    var defaultLanguageLabelName = "A-infrastructure";
    for (var i = 0; i < repoDefaults.length; i++) {
        var repoUrlSubStr = "servo/" + repoDefaults[i].repo + "/issues";
        if (issue.url && issue.url.match(repoUrlSubStr)) {
            defaultLanguageLabelName = repoDefaults[i].language;
            break;
        }
    }

    var defaultLanguageLabelIndex = langLabels.map(function (l) {
        return l.name;
    }).indexOf(defaultLanguageLabelName);

    if (langLabels[defaultLanguageLabelIndex]) {
        issue.labels.push(langLabels[defaultLanguageLabelIndex]);
    }
    return issue;
};

var extractFunction = function (callback) {
  return function (r1, r2) {
    var easies = r1[0].items,
        lessEasies = r2[0].items,
        all = easies.concat(lessEasies);

    all.sort(timeSort);
    all.map(addDefaultLanguageLabel);
    callback(all);
  };
};

var extractLabel = function (label, regex) {
  return label.match(regex)[1];
};

var issuesUrl = "https://api.github.com/search/issues";

var easyQuery = "q=state:open+user:servo&sort=updated"

var getPotentiallyOpenIssues = function (callback) {

    var today = new Date(),
        twoWeeksAgo = new Date(today - 86400000 * 14),
        olderThanTwoWeeks = "<" + twoWeeksAgo.toISOString().slice(0, 10);

    var easy = $.ajax({
        dataType: "json",
        url: issuesUrl,
        data: easyQuery,
    });

    var lessEasy = $.ajax({
        dataType: "json",
        url: issuesUrl,
        data: "q=updated:" + olderThanTwoWeeks + "+state:open&sort=updated"
    });

    var dataExtractor = extractFunction(callback);

    $.when(easy, lessEasy).done(dataExtractor);
};

var getOpenIssues = function (callback) {

    var easy = $.ajax({
        dataType: "json",
        url: issuesUrl,
        data: easyQuery,
    });

    var lessEasy = $.ajax({
        dataType: "json",
        url: issuesUrl,
        data: "q=state:open&sort=created"
    });

    var dataExtractor = extractFunction(callback);

    $.when(easy, lessEasy).done(dataExtractor);
};

var replacers = [
  {matcher: /^L-(.*)/, replacement: "Language: "},
  {matcher: /^A-(.*)/, replacement: "Area: "},
  {matcher: /^(?:S-|C-)(.*)/, replacement: "Status: "},
  {matcher: /^P-(.*)/, replacement: "Platform: "},
  {matcher: /^B-(.*)/, replacement: ""},
  {matcher: /^I-(.*)/, replacement: "Category: "}
];

var makeLabelFriendly = function (label) {
  var newLabel = label;

  var labelMap = {
    "A-infrastructure": "Infrastructure",
    "E-Easy": "Good first PR",
    "E-less easy": "Mentored"
  };

  if (labelMap[label]) {
    return labelMap[label];
  }

  replacers.forEach(function (item) {
    if (item.matcher.test(label)) {
      newLabel = item.replacement + extractLabel(label, item.matcher);
    }
  });

  return newLabel;
};

var label = function (data) {
    var color = (data.color === "d7e102" ||
                 data.color === "bfd4f2" ||
                 data.color === "d4c5f9" ||
                 data.color === "02d7e1") ? "black" : "white";

    var friendlyLabel = makeLabelFriendly(data.name);

    return d.span(
        {className: "label", style: {backgroundColor: "#" + data.color, color: color}},
        friendlyLabel
    );
};

var Labels = React.createClass({
    render: function() {
        return d.div(
            {className: "labels"},
            this.props.labels.map(label)
        );
    }
});

var labels = function (data) {
    return React.createElement(Labels, data);
};


var FilterLabel = React.createClass({
  render: function () {
    var color = (this.props.color === "d7e102" ||
                 this.props.color === "bfd4f2" ||
                 this.props.color === "d4c5f9" ||
                 this.props.color === "02d7e1") ? "black" : "white";

    var friendlyLabel = makeLabelFriendly(this.props.name);
    return d.span({className: "label",
                   style: {backgroundColor: "#" + this.props.color,
                           color: color,
                           cursor: "pointer",
                           opacity: this.props.selected ? 1.0 : 0.5},
                   onClick: this.props.onClick.bind(null, this.props)},
                   friendlyLabel);
  }
});

var filterLabel = function (data) {
  return React.createElement(FilterLabel, data);
};

var WantToWorkWith = React.createClass({
  render: function () {
    return d.span({className: "labels"}, this.props.labels.map(filterLabel));
  }
});

var wantToWorkWith = function (labels, onClick) {
  return React.createElement(WantToWorkWith, {labels: labels.map(function (label) {
    label.onClick = onClick;
    return label;
  })});
};


var repoUrl = function(url) {
    var urlArray = url.split("/");
    return urlArray[urlArray.length - 3];
};

var Issue = React.createClass({

    render: function () {
        return d.li(
            {className: "issue"},
            d.div(
                {},
                "[ ",
                d.a(
                    {
                        className: "issue-link",
                        href: this.props.html_url,
                        title: this.props.title
                    },
                    repoUrl(this.props.html_url) + " " + this.props.number
                ),
                " ] - ",
                d.span(
                    {className: "issue-desc"},
                    this.props.title
                )
            ),
            labels(this.props),
            d.div(
              {className: "time-wrapper"},
              d.span({className: "time"},
              d.i({className: "fa fa-clock-o"}),
              " Last activity: " + moment(this.props.updated_at).fromNow())
            )
        );
    }
});

var issueItem = function (data) {
    return React.createElement(Issue, data);
};

var IssueList = React.createClass({
    getInitialState: function () {
        return {
            limited: true
        };
    },

    getIssuesWithSelectedLabels: function (issues, selectedLabels) {
        var labelNames = selectedLabels.map(function (label) {
            return label.name;
        });

        var filteredIssues = issues.filter(function (issue) {
            for (var i = 0; i < issue.labels.length; i++) {
                if (labelNames.indexOf(issue.labels[i].name) > -1) {
                    return true;
                }
            }
            return false;
        });

        return filteredIssues;
    },

    render: function () {
        if (this.props.loading) {
            return d.div({id: "loading"});
        } else {
            var issues = this.getIssuesWithSelectedLabels(
                this.props.issues, this.props.selectedLabels);

            if (this.state.limited && issues.length > 5) {
                issues = issues.map(issueItem)
                                          .slice(0, 5)
                                          .concat(
                                              d.div(
                                                  {
                                                      className: "view-all",
                                                      onClick: function() {
                                                          this.setState({limited: false});
                                                      }.bind(this)
                                                  },
                                                  "view all..."
                                              )
                                          );
            } else {
                issues = issues.map(issueItem);
            }

            return d.ul(
                {id: "issues"},
                issues
            );
        }
    }
});

var issueList = function (issues, loading, filters) {
    var selectedLabels = filters.filter(function (label) {
        return label.selected;
    });
    return React.createElement(IssueList, {issues: issues, loading: loading, selectedLabels: selectedLabels});
};

var App = React.createClass({
    selectFilter: function (filterProps) {
        for (var i = 0; i < this.state.languageFilters.length; i++) {
            if (this.state.languageFilters[i].name === filterProps.name) {
                break;
            }
        }

        this.setState(function (oldState) {
            var lf = oldState.languageFilters;
            lf[i].selected = !lf[i].selected;
            return {languageFilters: lf};
        });
    },

    componentDidMount: function () {
        getOpenIssues(function (data) {
            this.setState({
                openIssues: data,
                openIssuesLoading: false
            });
        }.bind(this));

        getPotentiallyOpenIssues(function (data) {
            this.setState({
                potentiallyOpenIssues: data,
                potentiallyOpenIssuesLoading: false
            });
        }.bind(this));
    },

    getInitialState: function () {
        return {
            openIssuesLoading: true,
            potentiallyOpenIssuesLoading: true,
            openIssues: [],
            potentiallyOpenIssues: [],
            languageFilters: langLabels
        };
    },

    render: function () {
        return d.div(
            {},
            d.h2({}, "Some Infra Issues"),
            issueList(this.state.openIssues, this.state.openIssuesLoading, this.state.languageFilters),

            d.h2({}, "More Infra Issues"),
            issueList(this.state.potentiallyOpenIssues, this.state.potentiallyOpenIssuesLoading, this.state.languageFilters)
        );
    }
});

React.render(
    React.createElement(App, {}),
    document.getElementById("app")
);
